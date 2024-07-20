import { expect, test } from "bun:test";
import { GitError } from "./BaseError";

test("GitError", async () => {
  const fn = () => {
    throw new GitError("An error occurred");
  };

  expect(fn).toThrow("An error occurred");

  try {
    fn();
    expect().fail("GitError instance not thrown");
  } catch (e) {
    if (e instanceof GitError) {
      expect(e.toString()).toEqual('GitError: "An error occurred"');
    } else {
      expect().fail("GitError instance expected");
    }
  }
});
