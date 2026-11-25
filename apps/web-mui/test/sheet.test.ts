import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeSheet } from "../src/runtime/sheet.ts";
import { cssText } from "./helpers.ts";

describe("RuntimeSheet", () => {
  beforeEach(() => document.getElementById("vx-runtime")?.remove());
  afterEach(() => vi.restoreAllMocks());

  it("cria <style id=\"vx-runtime\"> com as vars por bloco", () => {
    const sheet = new RuntimeSheet(document);
    sheet.sync({ root: { "--vx-base-x": "1" }, light: { "--vx-a": "var(--vx-base-x)" }, dark: { "--vx-a": "red" } });
    expect(document.getElementById("vx-runtime")).toBeInstanceOf(HTMLStyleElement);
    const css = cssText();
    expect(css).toContain("--vx-a");
    expect(css).toMatch(/:root \{ --vx-base-x: 1; \}/);
    expect(css).toMatch(/:root, \[data-mode="light"\] \{ --vx-a: var\(--vx-base-x\); \}/);
    expect(css).toMatch(/\[data-mode="dark"\] \{ --vx-a: red; \}/);
    expect(css.indexOf('[data-mode="light"]')).toBeLessThan(css.indexOf('[data-mode="dark"]'));
  });

  it("só escreve as variáveis que mudaram", () => {
    const sheet = new RuntimeSheet(document);
    sheet.sync({ root: { "--vx-base-x": "1" }, light: { "--vx-a": "var(--vx-base-x)" }, dark: {} });
    const spy = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
    sheet.sync({ root: { "--vx-base-x": "2" }, light: { "--vx-a": "var(--vx-base-x)" }, dark: {} });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("--vx-base-x", "2");
    expect(cssText()).toContain("--vx-base-x: 2");
  });

  it("remove as variáveis que saíram do map", () => {
    const sheet = new RuntimeSheet(document);
    sheet.sync({ root: {}, light: { "--vx-a": "1", "--vx-b": "2" }, dark: {} });
    const set = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
    const remove = vi.spyOn(CSSStyleDeclaration.prototype, "removeProperty");
    sheet.sync({ root: {}, light: { "--vx-a": "1" }, dark: {} });
    expect(set).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("--vx-b");
    expect(cssText()).not.toContain("--vx-b");
  });

  it("reaproveita o mesmo elemento numa nova instância", () => {
    new RuntimeSheet(document).sync({ root: { "--vx-base-x": "1" }, light: {}, dark: {} });
    new RuntimeSheet(document).sync({ root: { "--vx-base-y": "1" }, light: {}, dark: {} });
    expect(document.querySelectorAll("#vx-runtime")).toHaveLength(1);
    expect(cssText()).not.toContain("--vx-base-x");
  });
});
