/**
 * Lightweight test assertion helpers for Deno test runner
 */

export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message || 'assertEquals failed'}\nExpected: ${expectedStr}\nActual:   ${actualStr}`);
  }
}

export function assertStringIncludes(str, snippet, message) {
  if (typeof str !== 'string' || !str.includes(snippet)) {
    throw new Error(`${message || 'assertStringIncludes failed'}\nString does not contain: "${snippet}"\nGot: "${str}"`);
  }
}

