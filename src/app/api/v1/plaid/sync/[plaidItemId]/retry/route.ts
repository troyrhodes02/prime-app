import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { runSyncPipeline } from "@/services/sync";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ plaidItemId: string }> },
) {
  const { plaidItemId } = await params;

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

  // Find the PlaidItem scoped to this user
  const plaidItem = await prisma.plaidItem.findFirst({
    where: { id: plaidItemId, userId: user.id },
    include: {
      syncJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!plaidItem) {
    const exists = await prisma.plaidItem.findUnique({
      where: { id: plaidItemId },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: "forbidden", message: "Access denied" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "not_found", message: "PlaidItem not found" },
      { status: 404 },
    );
  }

  // Validate FAILED status and create the new SyncJob atomically to prevent
  // concurrent retries from both passing the check and starting the pipeline twice.
  let syncJob: { id: string };
  try {
    ({ syncJob } = await prisma.$transaction(async (tx) => {
      const latestSyncJob = await tx.syncJob.findFirst({
        where: { plaidItemId: plaidItem.id },
        orderBy: { createdAt: "desc" },
        select: { status: true },
      });

      if (!latestSyncJob || latestSyncJob.status !== "FAILED") {
        throw Object.assign(new Error("No failed sync job to retry"), {
          code: "invalid_state_transition",
        });
      }

      const syncJob = await tx.syncJob.create({
        data: {
          userId: user.id,
          plaidItemId: plaidItem.id,
          type: "INITIAL",
          status: "PENDING",
          step: "CONNECTING",
        },
      });

      await tx.plaidItem.update({
        where: { id: plaidItem.id },
        data: { status: "CONNECTING" },
      });

      return { syncJob };
    }));
  } catch (error) {
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code === "invalid_state_transition"
    ) {
      return NextResponse.json(
        {
          error: "invalid_state_transition",
          message: "No failed sync job to retry",
        },
        { status: 400 },
      );
    }
    throw error;
  }

  after(async () => {
    try {
      await runSyncPipeline(syncJob.id);
    } catch (error) {
      console.error(
        "[plaid/sync/retry] Sync pipeline failed:",
        (error as Error).message,
      );
    }
  });

  return NextResponse.json({ sync_job_id: syncJob.id }, { status: 201 });
}
