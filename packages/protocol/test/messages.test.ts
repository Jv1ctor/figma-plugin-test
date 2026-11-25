import { describe, expect, it } from "vitest";
import { validateUpsertTokensShape } from "../src/index.ts";

describe("validateUpsertTokensShape", () => {
  it("accepts a minimal payload", () => {
    expect(validateUpsertTokensShape({ tokens: {} })).toEqual([]);
  });

  it("accepts a payload with remove.specific and muiModule", () => {
    expect(validateUpsertTokensShape({ tokens: {}, remove: { specific: ["a"] }, muiModule: "x" })).toEqual([]);
  });

  it("rejects a non-object payload", () => {
    expect(validateUpsertTokensShape(null)).toEqual(["payload deve ser um objeto"]);
  });

  it("requires a tokens object", () => {
    expect(validateUpsertTokensShape({})).toEqual(["tokens: objeto DTCG obrigatório"]);
  });

  it("requires remove.specific to be a string list", () => {
    expect(validateUpsertTokensShape({ tokens: {}, remove: { specific: [1] } })).toEqual(["remove.specific: lista de strings"]);
  });

  it("requires muiModule to be a string", () => {
    expect(validateUpsertTokensShape({ tokens: {}, muiModule: 1 })).toEqual(["muiModule: string"]);
  });
});
