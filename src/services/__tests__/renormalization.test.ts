import { describe, it, expect, vi } from "vitest";
import { runNormalizationPipeline } from "../normalization";

function makeMockTx({
  newRaws = [],
  existingNormalized = [],
}: {
  newRaws?: Array<Record<string, unknown>>;
  existingNormalized?: Array<Record<string, unknown>>;
} = {}) {
  const updatedRecords: Array<{ where: unknown; data: unknown }> = [];

  return {
    tx: {
      rawTransaction: {
        findMany: vi.fn().mockResolvedValue(newRaws),
      },
      normalizedTransaction: {
        findMany: vi.fn().mockResolvedValue(existingNormalized),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockImplementation((args: { where: unknown; data: unknown }) => {
          updatedRecords.push(args);
          return Promise.resolve({});
        }),
      },
    },
    updatedRecords,
  };
}

const NOW = new Date("2026-03-24T12:00:00Z");
const BEFORE = new Date("2026-03-24T10:00:00Z");
const AFTER = new Date("2026-03-24T14:00:00Z");

describe("re-normalization", () => {
  it("updates stale NormalizedTransaction when raw.updatedAt > norm.updatedAt", async () => {
    const { tx, updatedRecords } = makeMockTx({
      existingNormalized: [
        {
          id: "norm-1",
          userId: "user-1",
          isActive: true,
          updatedAt: BEFORE,
          displayName: "Old Merchant",
          amountCents: 500,
          pending: true,
          rawTransaction: {
            id: "raw-1",
            name: "NEW MERCHANT NAME",
            merchantName: "New Merchant",
            amountCents: 600,
            category: ["Food and Drink"],
            pending: false,
            updatedAt: AFTER,
          },
        },
      ],
    });

    const result = await runNormalizationPipeline("user-1", "item-1", tx as never);

    expect(result.updated).toBe(1);
    expect(updatedRecords).toHaveLength(1);
    expect(updatedRecords[0].where).toEqual({ id: "norm-1" });
    expect(updatedRecords[0].data).toEqual({
      displayName: "New Merchant",
      originalName: "NEW MERCHANT NAME",
      merchantName: "New Merchant",
      amountCents: 600,
      transactionType: "EXPENSE",
      category: "FOOD_AND_DRINK",
      pending: false,
    });
  });

  it("skips NormalizedTransaction when raw.updatedAt <= norm.updatedAt", async () => {
    const { tx, updatedRecords } = makeMockTx({
      existingNormalized: [
        {
          id: "norm-1",
          userId: "user-1",
          isActive: true,
          updatedAt: AFTER,
          displayName: "Merchant",
          amountCents: 500,
          pending: false,
          rawTransaction: {
            id: "raw-1",
            name: "MERCHANT",
            merchantName: "Merchant",
            amountCents: 500,
            category: [],
            pending: false,
            updatedAt: BEFORE,
          },
        },
      ],
    });

    const result = await runNormalizationPipeline("user-1", "item-1", tx as never);

    expect(result.updated).toBe(0);
    expect(updatedRecords).toHaveLength(0);
  });

  it("skips when updatedAt timestamps are equal", async () => {
    const { tx, updatedRecords } = makeMockTx({
      existingNormalized: [
        {
          id: "norm-1",
          userId: "user-1",
          isActive: true,
          updatedAt: NOW,
          rawTransaction: {
            id: "raw-1",
            name: "MERCHANT",
            merchantName: null,
            amountCents: 500,
            category: [],
            pending: false,
            updatedAt: NOW,
          },
        },
      ],
    });

    const result = await runNormalizationPipeline("user-1", "item-1", tx as never);

    expect(result.updated).toBe(0);
    expect(updatedRecords).toHaveLength(0);
  });

  it("correctly re-computes transactionType for income (negative amountCents)", async () => {
    const { tx, updatedRecords } = makeMockTx({
      existingNormalized: [
        {
          id: "norm-1",
          userId: "user-1",
          isActive: true,
          updatedAt: BEFORE,
          rawTransaction: {
            id: "raw-1",
            name: "EMPLOYER DIRECT DEP",
            merchantName: null,
            amountCents: -245000,
            category: ["Transfer", "Deposit"],
            pending: false,
            updatedAt: AFTER,
          },
        },
      ],
    });

    const result = await runNormalizationPipeline("user-1", "item-1", tx as never);

    expect(result.updated).toBe(1);
    expect(updatedRecords[0].data).toMatchObject({
      transactionType: "INCOME",
      category: "INCOME",
      amountCents: -245000,
    });
  });

  it("re-normalizes pending→posted transition", async () => {
    const { tx, updatedRecords } = makeMockTx({
      existingNormalized: [
        {
          id: "norm-1",
          userId: "user-1",
          isActive: true,
          updatedAt: BEFORE,
          rawTransaction: {
            id: "raw-1",
            name: "STARBUCKS",
            merchantName: "Starbucks",
            amountCents: 485,
            category: ["Food and Drink"],
            pending: false,
            updatedAt: AFTER,
          },
        },
      ],
    });

    const result = await runNormalizationPipeline("user-1", "item-1", tx as never);

    expect(result.updated).toBe(1);
    expect(updatedRecords[0].data).toMatchObject({
      pending: false,
    });
  });

  it("handles mixed stale and fresh records", async () => {
    const { tx, updatedRecords } = makeMockTx({
      existingNormalized: [
        {
          id: "norm-stale",
          userId: "user-1",
          isActive: true,
          updatedAt: BEFORE,
          rawTransaction: {
            id: "raw-1",
            name: "UPDATED",
            merchantName: "Updated",
            amountCents: 1000,
            category: [],
            pending: false,
            updatedAt: AFTER,
          },
        },
        {
          id: "norm-fresh",
          userId: "user-1",
          isActive: true,
          updatedAt: AFTER,
          rawTransaction: {
            id: "raw-2",
            name: "UNCHANGED",
            merchantName: "Unchanged",
            amountCents: 500,
            category: [],
            pending: false,
            updatedAt: BEFORE,
          },
        },
      ],
    });

    const result = await runNormalizationPipeline("user-1", "item-1", tx as never);

    expect(result.updated).toBe(1);
    expect(updatedRecords).toHaveLength(1);
    expect(updatedRecords[0].where).toEqual({ id: "norm-stale" });
  });

  it("returns created, duplicatesResolved, and updated counts", async () => {
    const { tx } = makeMockTx();

    const result = await runNormalizationPipeline("user-1", "item-1", tx as never);

    expect(result).toEqual({ created: 0, duplicatesResolved: 0, updated: 0 });
  });
});
