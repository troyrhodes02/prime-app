import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { plaidClient } from "@/lib/plaid";
import { encrypt } from "@/lib/encryption";
import { mapAccountType, runSyncPipeline } from "@/services/sync";

const ExchangeTokenSchema = z.object({
  public_token: z.string().min(1),
  institution: z.object({
    institution_id: z.string().min(1),
    name: z.string().min(1),
  }),
  accounts: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      official_name: z.string().nullable().optional(),
      type: z.string().min(1),
      subtype: z.string().nullable().optional(),
      mask: z.string().nullable().optional(),
    }),
  ).min(1),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });

  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authentication required" },
      { status: 401 },
    );
  }

  let body: z.infer<typeof ExchangeTokenSchema>;
  try {
    const raw = await request.json();
    body = ExchangeTokenSchema.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Invalid request body",
          details: error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "validation_error", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Exchange public token for access token
  let accessToken: string;
  let itemId: string;
  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: body.public_token,
    });
    accessToken = exchangeResponse.data.access_token;
    itemId = exchangeResponse.data.item_id;
  } catch (error) {
    console.error("[plaid/exchange-token] Token exchange failed:", (error as Error).message);
    return NextResponse.json(
      { error: "plaid_unavailable", message: "Failed to exchange token with Plaid" },
      { status: 502 },
    );
  }

  // Check for duplicate PlaidItem
  const existing = await prisma.plaidItem.findUnique({
    where: { plaidItemId: itemId },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: "duplicate_resource",
        message: "This institution is already connected",
        plaid_item_id: existing.id,
      },
      { status: 409 },
    );
  }

  // Create records atomically
  const encryptedToken = encrypt(accessToken);

  const result = await prisma.$transaction(async (tx) => {
    const plaidItem = await tx.plaidItem.create({
      data: {
        userId: user.id,
        plaidItemId: itemId,
        accessToken: encryptedToken,
        institutionId: body.institution.institution_id,
        institutionName: body.institution.name,
        status: "CONNECTING",
      },
    });

    const accountRecords = await Promise.all(
      body.accounts.map((account) =>
        tx.financialAccount.create({
          data: {
            userId: user.id,
            plaidItemId: plaidItem.id,
            plaidAccountId: account.id,
            name: account.name,
            officialName: account.official_name ?? null,
            type: mapAccountType(account.type),
            subtype: account.subtype ?? null,
            mask: account.mask ?? null,
          },
        }),
      ),
    );

    const syncJob = await tx.syncJob.create({
      data: {
        userId: user.id,
        plaidItemId: plaidItem.id,
        type: "INITIAL",
        status: "PENDING",
        step: "CONNECTING",
      },
    });

    return { plaidItem, accountRecords, syncJob };
  });

  // Run sync pipeline inline — response sent after completion
  try {
    await runSyncPipeline(result.syncJob.id);
  } catch (error) {
    // Sync failure is logged inside runSyncPipeline and SyncJob/PlaidItem
    // status is updated. We still return success for the record creation.
    console.error("[plaid/exchange-token] Sync pipeline failed:", (error as Error).message);
  }

  return NextResponse.json(
    {
      plaid_item_id: result.plaidItem.id,
      sync_job_id: result.syncJob.id,
      accounts_created: result.accountRecords.length,
    },
    { status: 201 },
  );
}
