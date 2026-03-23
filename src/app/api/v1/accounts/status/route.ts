import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

  const plaidItems = await prisma.plaidItem.findMany({
    where: { userId: user.id },
    include: {
      accounts: {
        select: {
          id: true,
          name: true,
          type: true,
          mask: true,
          isActive: true,
        },
      },
      syncJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          step: true,
          type: true,
          startedAt: true,
          completedAt: true,
          errorMessage: true,
          accountsSynced: true,
          transactionsSynced: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = plaidItems.map((item) => {
    const latestSync = item.syncJobs[0] ?? null;

    return {
      id: item.id,
      institution_id: item.institutionId,
      institution_name: item.institutionName,
      status: item.status,
      last_synced_at: item.lastSyncedAt?.toISOString() ?? null,
      accounts: item.accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        mask: a.mask,
        is_active: a.isActive,
      })),
      latest_sync: latestSync
        ? {
            id: latestSync.id,
            status: latestSync.status,
            step: latestSync.step,
            type: latestSync.type,
            started_at: latestSync.startedAt.toISOString(),
            completed_at: latestSync.completedAt?.toISOString() ?? null,
            error_message: latestSync.errorMessage,
            accounts_synced: latestSync.accountsSynced,
            transactions_synced: latestSync.transactionsSynced,
          }
        : null,
    };
  });

  const hasConnectedAccounts = items.length > 0;
  const hasActiveSync = items.some(
    (item) =>
      item.latest_sync?.status === "PENDING" ||
      item.latest_sync?.status === "IN_PROGRESS",
  );

  return NextResponse.json({
    items,
    has_connected_accounts: hasConnectedAccounts,
    has_active_sync: hasActiveSync,
  });
}
