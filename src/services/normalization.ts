import type { PrismaClient, RawTransaction, TransactionCategory, TransactionType } from "@prisma/client";
import { cleanMerchantName } from "@/lib/merchant-cleaning";

const PLAID_CATEGORY_MAP: Record<string, TransactionCategory> = {
  "Food and Drink": "FOOD_AND_DRINK",
  "Restaurants": "FOOD_AND_DRINK",
  "Coffee Shop": "FOOD_AND_DRINK",
  "Shops": "SHOPPING",
  "Shopping": "SHOPPING",
  "Travel": "TRANSPORTATION",
  "Transportation": "TRANSPORTATION",
  "Taxi": "TRANSPORTATION",
  "Airlines and Aviation Services": "TRANSPORTATION",
  "Gas Stations": "TRANSPORTATION",
  "Payment": "HOUSING",
  "Rent": "HOUSING",
  "Mortgage": "HOUSING",
  "Recreation": "ENTERTAINMENT",
  "Entertainment": "ENTERTAINMENT",
  "Arts and Entertainment": "ENTERTAINMENT",
  "Healthcare": "HEALTH",
  "Pharmacies": "HEALTH",
  "Personal Care": "PERSONAL",
  "Service": "PERSONAL",
  "Gyms and Fitness Centers": "PERSONAL",
  "Transfer": "TRANSFER",
  "Bank Fees": "TRANSFER",
  "Interest": "TRANSFER",
  "Deposit": "INCOME",
  "Payroll": "INCOME",
  "Utilities": "UTILITIES",
  "Telecommunication Services": "UTILITIES",
  "Internet Services": "UTILITIES",
};

const KNOWN_SUBSCRIPTION_MERCHANTS = new Set([
  "netflix",
  "spotify",
  "hulu",
  "disney+",
  "disney plus",
  "apple",
  "apple music",
  "apple tv+",
  "apple tv plus",
  "apple one",
  "amazon prime",
  "amazon music",
  "youtube premium",
  "youtube tv",
  "hbo max",
  "max",
  "peacock",
  "paramount+",
  "paramount plus",
  "discovery+",
  "discovery plus",
  "espn+",
  "espn plus",
  "audible",
  "kindle unlimited",
  "xbox game pass",
  "playstation plus",
  "nintendo switch online",
  "adobe",
  "microsoft 365",
  "microsoft office",
  "google one",
  "dropbox",
  "icloud",
  "lastpass",
  "1password",
  "duolingo",
  "calm",
  "headspace",
  "crunchyroll",
  "funimation",
  "sirius xm",
  "siriusxm",
  "pandora",
  "tidal",
  "deezer",
  "linkedin premium",
  "notion",
  "grammarly",
]);

export function mapCategory(
  plaidCategories: string[],
  transactionType: TransactionType,
  displayName: string,
): TransactionCategory {
  // 1. Income override — if transaction type is income, classify as INCOME
  if (transactionType === "INCOME") {
    return "INCOME";
  }

  // 2. Subscription detection — check displayName against known merchant list
  const nameLower = displayName.toLowerCase();
  if (KNOWN_SUBSCRIPTION_MERCHANTS.has(nameLower)) {
    return "SUBSCRIPTIONS";
  }

  // 3. Match Plaid categories (check each level, most specific first)
  for (const cat of [...plaidCategories].reverse()) {
    const mapped = PLAID_CATEGORY_MAP[cat];
    if (mapped) return mapped;
  }

  // 4. Fallback
  return "UNCATEGORIZED";
}

interface DuplicateResult {
  isDuplicate: boolean;
  survivorId: string | null;
}

async function resolveDuplicate(
  tx: PrismaClient,
  userId: string,
  raw: RawTransaction,
  amountCents: number,
  displayName: string,
): Promise<DuplicateResult> {
  // Case 1: This is a posted transaction — check if a pending version exists
  if (!raw.pending) {
    // Look for an active pending NormalizedTransaction with same plaidTransactionId
    const pendingVersion = await tx.normalizedTransaction.findFirst({
      where: {
        userId,
        plaidTransactionId: raw.plaidTransactionId,
        pending: true,
        isActive: true,
      },
    });

    if (pendingVersion) {
      await tx.normalizedTransaction.update({
        where: { id: pendingVersion.id },
        data: { isActive: false },
      });
      return { isDuplicate: false, survivorId: null };
    }

    // Fuzzy match: same account + same merchant + same amount + date within 3 days + pending
    const fuzzyPending = await tx.normalizedTransaction.findFirst({
      where: {
        userId,
        financialAccountId: raw.financialAccountId,
        displayName,
        amountCents,
        pending: true,
        isActive: true,
        date: {
          gte: new Date(raw.date.getTime() - 3 * 24 * 60 * 60 * 1000),
          lte: new Date(raw.date.getTime() + 3 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (fuzzyPending) {
      await tx.normalizedTransaction.update({
        where: { id: fuzzyPending.id },
        data: { isActive: false },
      });
      return { isDuplicate: false, survivorId: null };
    }
  }

  // Case 2: This is a pending transaction — check if a posted version already exists
  if (raw.pending) {
    const postedVersion = await tx.normalizedTransaction.findFirst({
      where: {
        userId,
        plaidTransactionId: raw.plaidTransactionId,
        pending: false,
        isActive: true,
      },
    });

    if (postedVersion) {
      return { isDuplicate: true, survivorId: postedVersion.id };
    }
  }

  return { isDuplicate: false, survivorId: null };
}

export interface NormalizationResult {
  created: number;
  duplicatesResolved: number;
  updated: number;
}

export async function runNormalizationPipeline(
  userId: string,
  plaidItemId: string,
  tx: PrismaClient,
): Promise<NormalizationResult> {
  // Find all raw transactions for this item that need normalization (USD only)
  const rawTransactions = await tx.rawTransaction.findMany({
    where: {
      userId,
      account: { plaidItemId },
      normalizedTransaction: null,
      OR: [{ isoCurrencyCode: "USD" }, { isoCurrencyCode: null }],
    },
    include: { account: true },
  });

  let created = 0;
  let duplicatesResolved = 0;

  for (const raw of rawTransactions) {
    const displayName = cleanMerchantName(raw.name, raw.merchantName);
    const amountCents = raw.amountCents;
    const transactionType: TransactionType = amountCents < 0 ? "INCOME" : "EXPENSE";
    const category = mapCategory(raw.category, transactionType, displayName);

    const duplicateResult = await resolveDuplicate(tx, userId, raw, amountCents, displayName);

    if (duplicateResult.isDuplicate) {
      duplicatesResolved++;
    }

    await tx.normalizedTransaction.create({
      data: {
        userId,
        financialAccountId: raw.financialAccountId,
        rawTransactionId: raw.id,
        plaidTransactionId: raw.plaidTransactionId,
        amountCents,
        isoCurrencyCode: raw.isoCurrencyCode ?? "USD",
        date: raw.date,
        displayName,
        originalName: raw.name,
        merchantName: raw.merchantName ?? null,
        category,
        transactionType,
        pending: raw.pending,
        isActive: !duplicateResult.isDuplicate,
        duplicateOf: duplicateResult.survivorId ?? null,
      },
    });

    created++;
  }

  // Re-normalization: detect stale NormalizedTransaction records where the
  // underlying RawTransaction was updated after the normalized record.
  const staleNormalized = await tx.normalizedTransaction.findMany({
    where: {
      userId,
      account: { plaidItemId },
      isActive: true,
    },
    include: { rawTransaction: true },
  });

  let updated = 0;

  for (const norm of staleNormalized) {
    if (norm.rawTransaction.updatedAt <= norm.updatedAt) continue;

    const raw = norm.rawTransaction;
    const displayName = cleanMerchantName(raw.name, raw.merchantName);
    const amountCents = raw.amountCents;
    const transactionType: TransactionType = amountCents < 0 ? "INCOME" : "EXPENSE";
    const category = mapCategory(raw.category, transactionType, displayName);

    // Re-run dedup when dedup-relevant fields changed
    const dedupFieldsChanged =
      norm.pending !== raw.pending ||
      norm.amountCents !== amountCents ||
      norm.displayName !== displayName;

    let isActive = norm.isActive;
    let duplicateOf = norm.duplicateOf;

    if (dedupFieldsChanged) {
      const dedupResult = await resolveDuplicate(tx, userId, raw, amountCents, displayName);
      if (dedupResult.isDuplicate) {
        isActive = false;
        duplicateOf = dedupResult.survivorId ?? null;
        duplicatesResolved++;
      }
    }

    await tx.normalizedTransaction.update({
      where: { id: norm.id },
      data: {
        displayName,
        originalName: raw.name,
        merchantName: raw.merchantName ?? null,
        amountCents,
        transactionType,
        category,
        pending: raw.pending,
        isActive,
        duplicateOf,
      },
    });

    updated++;
  }

  return { created, duplicatesResolved, updated };
}
