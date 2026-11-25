export type Layer = "base" | "semantic" | "specific";
export type Mode = "light" | "dark";
export const MODES: readonly Mode[] = ["light", "dark"];
export type TokenType = "color" | "dimension" | "number" | "fontFamily" | "fontWeight";
export type Flex = "locked" | "adjustable" | "free";
export type CompositeRef = { color: string; opacity: string }; // nomes da base
export type AliasValue = string | CompositeRef; // string = nome da base
export interface TokenMeta { type: TokenType; scopes: string[]; description: string; flex: Flex }
export interface BaseToken extends TokenMeta { name: string; value: string | number } // cor = "#rrggbb" ou "#rrggbbaa"
export interface AliasToken extends TokenMeta { name: string; values: Record<Mode, AliasValue> }
export interface TextStyle { name: string; description: string; fontSize: string; lineHeight: string; fontWeight: string; letterSpacing: string; fontFamily: string }
export interface ShadowStyle { name: string; description: string; offsetX: string; offsetY: string; blur: string; spread: string; color: string }
export type OptionalGroup = "brand-2" | "brand-3" | "brand-4" | "data";
export interface TokenSet {
  base: Record<string, BaseToken>;
  semantic: Record<string, AliasToken>;
  specific: Record<string, AliasToken>;
  textStyles: TextStyle[];
  shadowStyles: ShadowStyle[];
  disabledGroups: OptionalGroup[];
}
export type Resolved =
  | { kind: "color"; hex: string; alpha: number }
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "missing"; ref: string };
