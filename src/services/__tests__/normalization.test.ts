import { describe, it, expect, beforeEach } from "vitest";
import { cleanMerchantName } from "@/lib/merchant-cleaning";
import { mapCategory } from "../normalization";

// ---------------------------------------------------------------------------
// Merchant Name Cleaning
// ---------------------------------------------------------------------------

describe("cleanMerchantName", () => {
  it("cleans common POS prefixes", () => {
    // GIVEN: rawName with TST* prefix and trailing ID
    // WHEN: cleanMerchantName runs with no plaidMerchantName
    // THEN: Returns cleaned, title-cased name
    expect(cleanMerchantName("TST* STARBUCKS #12345", null)).toBe("Starbucks");
  });

  it("prefers Plaid merchant name when available", () => {
    // GIVEN: raw name is messy but plaidMerchantName is clean
    // WHEN: cleanMerchantName runs
    // THEN: Returns plaidMerchantName
    expect(cleanMerchantName("AMZN MKTP US*2A1B3C", "Amazon")).toBe("Amazon");
  });

  it("title-cases all-uppercase names", () => {
    // GIVEN: rawName is all uppercase
    // WHEN: cleanMerchantName runs
    // THEN: Returns title-cased version
    expect(cleanMerchantName("WHOLE FOODS MARKET", null)).toBe("Whole Foods Market");
  });

  it("never returns empty string", () => {
    // GIVEN: rawName where prefix removal yields empty
    // WHEN: cleanMerchantName runs
    // THEN: Returns original rawName as fallback
    expect(cleanMerchantName("TST*", null)).toBe("TST*");
  });

  it("strips SQ* prefix", () => {
    expect(cleanMerchantName("SQ *COFFEE SHOP", null)).toBe("Coffee Shop");
  });

  it("strips SP* prefix", () => {
    expect(cleanMerchantName("SP * SUBSCRIPTION SVC", null)).toBe("Subscription Svc");
  });

  it("removes trailing ZIP codes", () => {
    expect(cleanMerchantName("TARGET 12345", null)).toBe("Target");
  });

  it("removes trailing state abbreviations", () => {
    expect(cleanMerchantName("WALMART SUPERCENTER CA", null)).toBe("Walmart Supercenter");
  });

  it("removes trailing reference codes", () => {
    expect(cleanMerchantName("UBER EATS *ABCD1234", null)).toBe("Uber Eats");
  });

  it("trims whitespace from plaidMerchantName", () => {
    expect(cleanMerchantName("RAW NAME", "  Spotify  ")).toBe("Spotify");
  });

  it("ignores empty plaidMerchantName", () => {
    expect(cleanMerchantName("WHOLE FOODS MARKET", "")).toBe("Whole Foods Market");
  });

  it("ignores whitespace-only plaidMerchantName", () => {
    expect(cleanMerchantName("WHOLE FOODS MARKET", "   ")).toBe("Whole Foods Market");
  });
});

// ---------------------------------------------------------------------------
// Category Mapping
// ---------------------------------------------------------------------------

describe("mapCategory", () => {
  it("maps Food and Drink category", () => {
    // GIVEN: Plaid categories with Food and Drink
    // WHEN: mapCategory runs
    // THEN: Returns FOOD_AND_DRINK
    expect(mapCategory(["Food and Drink", "Restaurants", "Coffee Shop"], "EXPENSE", "Starbucks"))
      .toBe("FOOD_AND_DRINK");
  });

  it("income overrides Plaid category", () => {
    // GIVEN: Plaid categories say Transfer/Deposit but type is INCOME
    // WHEN: mapCategory runs
    // THEN: Returns INCOME (not TRANSFER)
    expect(mapCategory(["Transfer", "Deposit"], "INCOME", "Employer Inc"))
      .toBe("INCOME");
  });

  it("subscription merchant overrides Plaid category", () => {
    // GIVEN: Plaid says Shopping but displayName is Netflix
    // WHEN: mapCategory runs
    // THEN: Returns SUBSCRIPTIONS (name match takes priority)
    expect(mapCategory(["Shops", "Digital Purchase"], "EXPENSE", "Netflix"))
      .toBe("SUBSCRIPTIONS");
  });

  it("subscription detection is case-insensitive", () => {
    // GIVEN: displayName is all caps "SPOTIFY"
    // WHEN: mapCategory runs
    // THEN: Returns SUBSCRIPTIONS
    expect(mapCategory([], "EXPENSE", "SPOTIFY")).toBe("SUBSCRIPTIONS");
  });

  it("non-subscription merchant is not misclassified", () => {
    // GIVEN: Plaid category is Shops, displayName is Target (not a subscription)
    // WHEN: mapCategory runs
    // THEN: Returns SHOPPING (not SUBSCRIPTIONS)
    expect(mapCategory(["Shops"], "EXPENSE", "Target")).toBe("SHOPPING");
  });

  it("unmapped category returns UNCATEGORIZED", () => {
    // GIVEN: Unknown Plaid category
    // WHEN: mapCategory runs
    // THEN: Returns UNCATEGORIZED
    expect(mapCategory(["Something Unknown"], "EXPENSE", "Random Store")).toBe("UNCATEGORIZED");
  });

  it("empty Plaid categories returns UNCATEGORIZED", () => {
    expect(mapCategory([], "EXPENSE", "Some Place")).toBe("UNCATEGORIZED");
  });

  it("maps Transportation category", () => {
    expect(mapCategory(["Travel", "Airlines and Aviation Services"], "EXPENSE", "Delta")).toBe("TRANSPORTATION");
  });

  it("maps Healthcare category", () => {
    expect(mapCategory(["Healthcare", "Pharmacies"], "EXPENSE", "CVS")).toBe("HEALTH");
  });

  it("maps Utilities category", () => {
    expect(mapCategory(["Utilities"], "EXPENSE", "Electric Co")).toBe("UTILITIES");
  });

  it("maps Transfer category for expenses", () => {
    expect(mapCategory(["Transfer"], "EXPENSE", "Wire Transfer")).toBe("TRANSFER");
  });

  it("prefers most specific Plaid category (last in array)", () => {
    // Plaid sends categories general → specific; we reverse to check specific first
    expect(mapCategory(["Shops", "Gyms and Fitness Centers"], "EXPENSE", "Planet Fitness")).toBe("PERSONAL");
  });
});
