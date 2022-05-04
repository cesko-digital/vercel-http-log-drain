import { AssertionError } from "assert";

export const randomString = (length: number) =>
  (Math.random() + 1).toString(36).slice(2, 2 + length);

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError({ message });
  }
}
