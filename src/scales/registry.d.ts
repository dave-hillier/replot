/** Scale kind symbol for positional scales (x, y, fx, fy). */
export const position: unique symbol;

/** Scale kind symbol for color scales. */
export const color: unique symbol;

/** Scale kind symbol for radius scales. */
export const radius: unique symbol;

/** Scale kind symbol for length scales. */
export const length: unique symbol;

/** Scale kind symbol for opacity scales. */
export const opacity: unique symbol;

/** Scale kind symbol for symbol scales. */
export const symbol: unique symbol;

/** Scale kind symbol for projection pseudo-scales. */
export const projection: unique symbol;

/** A map from scale name (e.g. "x", "color") to its scale kind symbol. */
export const registry: Map<string, symbol>;

/** Returns true if the scale kind is positional (position or projection). */
export function isPosition(kind: symbol): boolean;

/** Returns true if the scale kind has a numeric range. */
export function hasNumericRange(kind: symbol): boolean;
