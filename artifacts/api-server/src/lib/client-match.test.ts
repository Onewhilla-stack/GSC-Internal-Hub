import { describe, it, expect } from "vitest";
import { resolveClientMatch } from "./client-match";

const alice = { id: 1, name: "Alice Wanjiru", phone: null };
const bob = { id: 2, name: "Bob Omondi", phone: "0712345678" };

describe("resolveClientMatch — empty / blank name", () => {
  it("returns skip for an empty string", () => {
    expect(resolveClientMatch("", undefined, [alice])).toEqual({ kind: "skip" });
  });

  it("returns skip for a whitespace-only string", () => {
    expect(resolveClientMatch("   ", undefined, [alice])).toEqual({ kind: "skip" });
  });

  it("returns skip even when candidates exist", () => {
    expect(resolveClientMatch("", "0700000000", [alice, bob])).toEqual({ kind: "skip" });
  });
});

describe("resolveClientMatch — exact name match", () => {
  it("returns match with the correct id", () => {
    const result = resolveClientMatch("Alice Wanjiru", undefined, [alice, bob]);
    expect(result).toMatchObject({ kind: "match", id: 1 });
  });

  it("sets backfillPhone to null when the matched client already has a phone", () => {
    const result = resolveClientMatch("Bob Omondi", "0799999999", [alice, bob]);
    expect(result).toEqual({ kind: "match", id: 2, backfillPhone: null });
  });
});

describe("resolveClientMatch — case / whitespace insensitive match", () => {
  it("matches when input is all-uppercase", () => {
    const result = resolveClientMatch("ALICE WANJIRU", undefined, [alice]);
    expect(result).toMatchObject({ kind: "match", id: 1 });
  });

  it("matches when input is all-lowercase", () => {
    const result = resolveClientMatch("alice wanjiru", undefined, [alice]);
    expect(result).toMatchObject({ kind: "match", id: 1 });
  });

  it("matches when input has mixed casing", () => {
    const result = resolveClientMatch("aLiCe WaNjIrU", undefined, [alice]);
    expect(result).toMatchObject({ kind: "match", id: 1 });
  });

  it("matches when input has leading/trailing whitespace", () => {
    const result = resolveClientMatch("  Alice Wanjiru  ", undefined, [alice]);
    expect(result).toMatchObject({ kind: "match", id: 1 });
  });

  it("matches when the stored name has extra surrounding whitespace", () => {
    const padded = { id: 3, name: "  Carol Muthoni  ", phone: null };
    const result = resolveClientMatch("Carol Muthoni", undefined, [padded]);
    expect(result).toMatchObject({ kind: "match", id: 3 });
  });

  it("matches when both input and stored name differ in case and have extra whitespace", () => {
    const padded = { id: 4, name: "  David Kamau  ", phone: null };
    const result = resolveClientMatch("  DAVID KAMAU  ", undefined, [padded]);
    expect(result).toMatchObject({ kind: "match", id: 4 });
  });
});

describe("resolveClientMatch — phone backfill decision", () => {
  it("backfills phone when the matched client has no phone and a phone is supplied", () => {
    const result = resolveClientMatch("Alice Wanjiru", "0711111111", [alice]);
    expect(result).toEqual({ kind: "match", id: 1, backfillPhone: "0711111111" });
  });

  it("trims the supplied phone before backfilling", () => {
    const result = resolveClientMatch("Alice Wanjiru", "  0711111111  ", [alice]);
    expect(result).toEqual({ kind: "match", id: 1, backfillPhone: "0711111111" });
  });

  it("does not backfill when no phone is supplied", () => {
    const result = resolveClientMatch("Alice Wanjiru", undefined, [alice]);
    expect(result).toEqual({ kind: "match", id: 1, backfillPhone: null });
  });

  it("does not backfill when an empty phone string is supplied", () => {
    const result = resolveClientMatch("Alice Wanjiru", "", [alice]);
    expect(result).toEqual({ kind: "match", id: 1, backfillPhone: null });
  });

  it("does not backfill when the matched client already has a phone", () => {
    const result = resolveClientMatch("Bob Omondi", "0799999999", [alice, bob]);
    expect(result).toEqual({ kind: "match", id: 2, backfillPhone: null });
  });
});

describe("resolveClientMatch — same client regardless of capitalisation or surrounding spaces", () => {
  const stored = { id: 99, name: "Alice", phone: null };

  it("matches the exact stored name", () => {
    expect(resolveClientMatch("Alice", undefined, [stored])).toMatchObject({ kind: "match", id: 99 });
  });

  it("matches all-lowercase input", () => {
    expect(resolveClientMatch("alice", undefined, [stored])).toMatchObject({ kind: "match", id: 99 });
  });

  it("matches input with leading and trailing spaces", () => {
    expect(resolveClientMatch("  Alice  ", undefined, [stored])).toMatchObject({ kind: "match", id: 99 });
  });

  it("all three variants resolve to the same record id", () => {
    const variants = ["Alice", "alice", "  Alice  "];
    const ids = variants.map((v) => {
      const result = resolveClientMatch(v, undefined, [stored]);
      expect(result.kind).toBe("match");
      return (result as Extract<typeof result, { kind: "match" }>).id;
    });
    expect(new Set(ids).size).toBe(1);
  });
});

describe("resolveClientMatch — no match (new client path)", () => {
  it("returns create when there are no candidates", () => {
    const result = resolveClientMatch("Eve Kamau", "0722222222", []);
    expect(result).toEqual({ kind: "create", trimmedName: "Eve Kamau", trimmedPhone: "0722222222" });
  });

  it("returns create when the name does not match any candidate", () => {
    const result = resolveClientMatch("Unknown Person", undefined, [alice, bob]);
    expect(result).toEqual({ kind: "create", trimmedName: "Unknown Person", trimmedPhone: null });
  });

  it("trims the name in the create payload", () => {
    const result = resolveClientMatch("  Frank Otieno  ", "0733333333", []);
    expect(result).toEqual({ kind: "create", trimmedName: "Frank Otieno", trimmedPhone: "0733333333" });
  });

  it("sets trimmedPhone to null when no phone is supplied", () => {
    const result = resolveClientMatch("Grace Njeri", undefined, []);
    expect(result).toEqual({ kind: "create", trimmedName: "Grace Njeri", trimmedPhone: null });
  });

  it("sets trimmedPhone to null when a whitespace-only phone is supplied", () => {
    const result = resolveClientMatch("Henry Mwangi", "   ", []);
    expect(result).toEqual({ kind: "create", trimmedName: "Henry Mwangi", trimmedPhone: null });
  });
});
