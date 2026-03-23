import { prisma } from "@/lib/prisma";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/encryption";
import { AccountType } from "@prisma/client";

export function toCents(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  return Math.round(amount * 100);
}

export function mapAccountType(plaidType: string): AccountType {
  switch (plaidType.toLowerCase()) {
    case "depository":
      return "DEPOSITORY";
    case "credit":
      return "CREDIT";
    case "loan":
      return "LOAN";
    case "investment":
      return "INVESTMENT";
    case "brokerage":
      return "BROKERAGE";
    default:
      return "OTHER";
  }
}

function formatDateYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

async function plaidCallWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Object &&
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status === 429;

      if (!isRateLimit || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    // Strip anything that looks like a token
    return msg.replace(/access-sandbox-[a-z0-9-]+/gi, "[REDACTED]")
      .replace(/access-development-[a-z0-9-]+/gi, "[REDACTED]")
      .replace(/access-production-[a-z0-9-]+/gi, "[REDACTED]")
      .slice(0, 500);
  }
  return "Unknown error";
}

export async function runSyncPipeline(syncJobId: string): Promise<void> {
  const syncJob = await prisma.syncJob.findUniqueOrThrow({
    where: { id: syncJobId },
    include: { plaidItem: true },
  });

  const accessToken = decrypt(syncJob.plaidItem.accessToken);

  try {
    // Step 1: SYNCING_BALANCES
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: { step: "SYNCING_BALANCES", status: "IN_PROGRESS" },
    });

    const balanceResponse = await plaidCallWithRetry(() =>
      plaidClient.accountsBalanceGet({ access_token: accessToken }),
    );

    for (const account of balanceResponse.data.accounts) {
      await prisma.financialAccount.updateMany({
        where: {
          plaidAccountId: account.account_id,
          userId: syncJob.userId,
        },
        data: {
          currentBalanceCents: toCents(account.balances.current),
          availableBalanceCents: toCents(account.balances.available),
          isoCurrencyCode: account.balances.iso_currency_code ?? undefined,
          unofficialCurrencyCode: account.balances.unofficial_currency_code ?? undefined,
        },
      });
    }

    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        accountsSynced: balanceResponse.data.accounts.length,
      },
    });

    // Step 2: RETRIEVING_TRANSACTIONS
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: { step: "RETRIEVING_TRANSACTIONS" },
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const allTransactions = await fetchAllTransactions(
      accessToken,
      formatDateYMD(startDate),
      formatDateYMD(endDate),
    );

    // Build a map of plaidAccountId → financialAccountId for this user
    const accounts = await prisma.financialAccount.findMany({
      where: { plaidItemId: syncJob.plaidItemId, userId: syncJob.userId },
      select: { id: true, plaidAccountId: true },
    });
    const accountMap = new Map(accounts.map((a) => [a.plaidAccountId, a.id]));

    let transactionsSynced = 0;
    for (const txn of allTransactions) {
      const financialAccountId = accountMap.get(txn.account_id);
      if (!financialAccountId) continue;

      await prisma.rawTransaction.upsert({
        where: { plaidTransactionId: txn.transaction_id },
        create: {
          userId: syncJob.userId,
          financialAccountId,
          plaidTransactionId: txn.transaction_id,
          amountCents: Math.round(txn.amount * 100),
          isoCurrencyCode: txn.iso_currency_code ?? undefined,
          unofficialCurrencyCode: txn.unofficial_currency_code ?? undefined,
          date: new Date(txn.date),
          authorizedDate: txn.authorized_date ? new Date(txn.authorized_date) : undefined,
          name: txn.name,
          merchantName: txn.merchant_name ?? undefined,
          category: txn.category ?? [],
          pending: txn.pending,
        },
        update: {
          amountCents: Math.round(txn.amount * 100),
          name: txn.name,
          merchantName: txn.merchant_name ?? undefined,
          category: txn.category ?? [],
          pending: txn.pending,
        },
      });
      transactionsSynced++;
    }

    // Step 3: ANALYZING → DONE
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: { step: "ANALYZING" },
    });

    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        step: "DONE",
        status: "COMPLETED",
        completedAt: new Date(),
        transactionsSynced,
      },
    });

    await prisma.plaidItem.update({
      where: { id: syncJob.plaidItemId },
      data: { status: "ACTIVE", lastSyncedAt: new Date() },
    });
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: syncJobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: sanitizeErrorMessage(error),
      },
    });

    await prisma.plaidItem.update({
      where: { id: syncJob.plaidItemId },
      data: { status: "ERROR" },
    });

    throw error;
  }
}

async function fetchAllTransactions(
  accessToken: string,
  startDate: string,
  endDate: string,
) {
  type PlaidTransaction = {
    account_id: string;
    transaction_id: string;
    amount: number;
    iso_currency_code?: string | null;
    unofficial_currency_code?: string | null;
    date: string;
    authorized_date?: string | null;
    name: string;
    merchant_name?: string | null;
    category?: string[] | null;
    pending: boolean;
  };

  const allTransactions: PlaidTransaction[] = [];

  let hasMore = true;
  let offset = 0;

  while (hasMore) {
    const response = await plaidCallWithRetry(() =>
      plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: { count: 500, offset },
      }),
    );

    allTransactions.push(...response.data.transactions);
    hasMore = allTransactions.length < response.data.total_transactions;
    offset = allTransactions.length;
  }

  return allTransactions;
}
