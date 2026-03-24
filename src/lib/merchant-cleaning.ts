export function cleanMerchantName(
  rawName: string,
  plaidMerchantName: string | null | undefined,
): string {
  // 1. Prefer Plaid's merchantName when available — it is already cleaned
  if (plaidMerchantName && plaidMerchantName.trim().length > 0) {
    return plaidMerchantName.trim();
  }

  let name = rawName.trim();

  // 2. Remove common prefixes (POS, TST*, SQ*, etc.)
  name = name.replace(/^(TST\*|SQ\s*\*|SP\s*\*|POS\s+|CHK\s+|ACH\s+|ORIG\s+)/i, "").trim();

  // 3. Remove trailing transaction IDs and reference numbers
  name = name.replace(/\s*#\d{3,}$/i, "").trim();
  name = name.replace(/\s*\*[A-Z0-9]{4,}$/i, "").trim();

  // 4. Remove trailing location suffixes (city/state patterns)
  name = name.replace(/\s+\d{5}(-\d{4})?\s*$/, "").trim(); // ZIP codes
  name = name.replace(/\s+[A-Z]{2}\s*$/, "").trim(); // state abbreviations at end

  // 5. Title case if all uppercase
  if (name === name.toUpperCase() && name.length > 2) {
    name = name
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // 6. Fallback — never return empty
  if (name.length === 0) {
    return rawName.trim();
  }

  return name;
}
