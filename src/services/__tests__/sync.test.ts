import { describe, it, expect } from "vitest";
import { toCents, mapAccountType } from "../sync";

describe("toCents", () => {
  it("converts positive float to integer cents", () => {
    expect(toCents(123.45)).toBe(12345);
  });

  it("converts negative float to integer cents", () => {
    expect(toCents(-67.89)).toBe(-6789);
  });

  it("converts zero to zero cents", () => {
    expect(toCents(0)).toBe(0);
  });

  it("rounds using Math.round on float * 100", () => {
    // Plaid sends floats; toCents uses Math.round(amount * 100)
    // This matches Plaid's documented precision (2 decimal places)
    expect(toCents(10.50)).toBe(1050);
    expect(toCents(99.99)).toBe(9999);
    expect(toCents(0.01)).toBe(1);
  });

  it("handles large amounts", () => {
    expect(toCents(999999.99)).toBe(99999999);
  });

  it("returns null for null input", () => {
    expect(toCents(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(toCents(undefined)).toBeNull();
  });

  it("converts whole number to cents", () => {
    expect(toCents(50)).toBe(5000);
  });

  it("always returns an integer", () => {
    const result = toCents(33.33);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(3333);
  });
});

describe("mapAccountType", () => {
  it("maps depository to DEPOSITORY", () => {
    expect(mapAccountType("depository")).toBe("DEPOSITORY");
  });

  it("maps credit to CREDIT", () => {
    expect(mapAccountType("credit")).toBe("CREDIT");
  });

  it("maps loan to LOAN", () => {
    expect(mapAccountType("loan")).toBe("LOAN");
  });

  it("maps investment to INVESTMENT", () => {
    expect(mapAccountType("investment")).toBe("INVESTMENT");
  });

  it("maps brokerage to BROKERAGE", () => {
    expect(mapAccountType("brokerage")).toBe("BROKERAGE");
  });

  it("maps other to OTHER", () => {
    expect(mapAccountType("other")).toBe("OTHER");
  });

  it("maps unknown type to OTHER", () => {
    expect(mapAccountType("something_new")).toBe("OTHER");
  });

  it("is case-insensitive", () => {
    expect(mapAccountType("DEPOSITORY")).toBe("DEPOSITORY");
    expect(mapAccountType("Credit")).toBe("CREDIT");
  });
});
