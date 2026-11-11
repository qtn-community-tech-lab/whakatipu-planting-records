import { assert } from "vitest";

/** Fail clearly when an expected fixture row or field is missing. */
export function defined<T>(value: T | undefined): T {
  assert.isDefined(value, "Expected a fixture value to be present");
  return value;
}
