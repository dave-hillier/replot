import assert from "assert";

export function warns(run, expected = /warning/i) {
  const actual = [];
  const warn = console.warn;
  let result;
  try {
    console.warn = (warning) => void actual.push(warning);
    result = run();
    assert.strictEqual(actual.length, 1, "expected 1 warning");
    assert.match(actual[0], expected);
  } finally {
    console.warn = warn;
  }
  return result;
}

export async function warnsAsync(run, expected = /warning/i) {
  const actual = [];
  const warn = console.warn;
  let result;
  try {
    console.warn = (warning) => void actual.push(warning);
    result = await run();
    assert.strictEqual(actual.length, 1, "expected 1 warning");
    assert.match(actual[0], expected);
  } finally {
    console.warn = warn;
  }
  return result;
}

export function doesNotWarn(run) {
  const actual = [];
  const warn = console.warn;
  let result;
  try {
    console.warn = (warning) => void actual.push(warning);
    result = run();
    assert.strictEqual(actual.length, 0, "expected 0 warnings");
  } finally {
    console.warn = warn;
  }
  return result;
}

export async function doesNotWarnAsync(run) {
  const actual = [];
  const warn = console.warn;
  let result;
  try {
    console.warn = (warning) => void actual.push(warning);
    result = await run();
    assert.strictEqual(actual.length, 0, "expected 0 warnings");
  } finally {
    console.warn = warn;
  }
  return result;
}

// The default export is the Node assert object with the warning-aware
// helpers mixed in, which is how the JavaScript tests use it (`assert.warns`).
// They are exported by name as well, because a TypeScript test cannot call an
// assertion function through a property of a default-exported object
// (TS2775: "Assertions require every name in the call target to be declared
// with an explicit type annotation").
export default {
  ...assert,
  warns,
  warnsAsync,
  doesNotWarn,
  doesNotWarnAsync
};
