import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "../encryption";

const TEST_KEY = "86beb8fa2486af7c8517b2538985d46531d82c4fbdfb7709f2f4ceb991fb911e";

describe("encryption", () => {
  beforeEach(() => {
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  });

  describe("encrypt / decrypt roundtrip", () => {
    it("decrypts to original plaintext", () => {
      const plaintext = "access-sandbox-abc123def456";
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("handles empty string", () => {
      const ciphertext = encrypt("");
      expect(decrypt(ciphertext)).toBe("");
    });

    it("handles unicode characters", () => {
      const plaintext = "test-token-with-unicode-🔑";
      const ciphertext = encrypt(plaintext);
      expect(decrypt(ciphertext)).toBe(plaintext);
    });

    it("produces different ciphertexts on each call (random IV)", () => {
      const plaintext = "same-token";
      const ct1 = encrypt(plaintext);
      const ct2 = encrypt(plaintext);
      expect(ct1).not.toBe(ct2);
    });

    it("ciphertext has iv:tag:encrypted format", () => {
      const ciphertext = encrypt("test-token");
      const parts = ciphertext.split(":");
      expect(parts).toHaveLength(3);
      expect(parts[0]).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32); // 16 byte tag = 32 hex chars
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe("decrypt error cases", () => {
    it("throws on wrong key", () => {
      const ciphertext = encrypt("test-token");

      const wrongKey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      process.env.PLAID_TOKEN_ENCRYPTION_KEY = wrongKey;

      expect(() => decrypt(ciphertext)).toThrow();
    });

    it("throws on malformed ciphertext", () => {
      expect(() => decrypt("not-valid-ciphertext")).toThrow();
    });

    it("throws on tampered ciphertext", () => {
      const ciphertext = encrypt("test-token");
      const parts = ciphertext.split(":");
      // Tamper with the encrypted payload
      const tampered = `${parts[0]}:${parts[1]}:deadbeef`;
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("key validation", () => {
    it("throws when key is not set", () => {
      delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
      expect(() => encrypt("test")).toThrow("PLAID_TOKEN_ENCRYPTION_KEY is not set");
    });

    it("throws when key is wrong length", () => {
      process.env.PLAID_TOKEN_ENCRYPTION_KEY = "tooshort";
      expect(() => encrypt("test")).toThrow("32-byte hex string");
    });
  });
});
