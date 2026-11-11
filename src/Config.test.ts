import { expect, test } from "bun:test";
import { resolveServiceTokens, serviceTokenEnvName } from "./Config";

const base = {
  name: "my_gitlab",
  type: "gitlab" as const,
  url: "https://gitlab.com",
  apiUrl: "https://gitlab.com/api/v4",
};

test("env var name is the uppercased service name", () => {
  expect(serviceTokenEnvName("my_gitlab")).toBe("STATICMAN_MY_GITLAB_TOKEN");
});

test("env var overrides the token from the file", () => {
  const [s] = resolveServiceTokens([{ ...base, token: "file" }], {
    STATICMAN_MY_GITLAB_TOKEN: "env",
  });
  expect(s?.token).toBe("env");
});

test("token from the file is used when no env var is set", () => {
  const [s] = resolveServiceTokens([{ ...base, token: "file" }], {});
  expect(s?.token).toBe("file");
});

test("env var alone is enough", () => {
  const [s] = resolveServiceTokens([{ ...base, token: null }], {
    STATICMAN_MY_GITLAB_TOKEN: "env",
  });
  expect(s?.token).toBe("env");
});

test("missing token throws a clear error", () => {
  expect(() => resolveServiceTokens([{ ...base, token: null }], {})).toThrow(
    "STATICMAN_MY_GITLAB_TOKEN",
  );
});
