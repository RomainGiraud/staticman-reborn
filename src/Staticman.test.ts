import { expect, describe, beforeAll, afterEach, afterAll, it } from "bun:test";
import { setupServer } from "msw/node";
import Staticman from "./Staticman";
import _ from "lodash";
import {
  handlers,
  requestParameters,
  bodyRequest,
  registerConfigFile,
  unregisterConfigFile,
  createDefaultConfig,
} from "./mocks/gitlab";

const server = setupServer(...handlers);

// Establish API mocking before all tests.
beforeAll(() =>
  server.listen({
    onUnhandledRequest: "error",
  }),
);

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

describe("Add a comment", () => {
  it.each([
    ["as YAML file", "staticman.yaml.yaml", { comments: { format: "yaml" } }],
    ["as JSON file", "staticman.json.yaml", { comments: { format: "json" } }],
    [
      "as frontmatter of a Markdown file",
      "staticman.md.yaml",
      { comments: { format: { type: "md", content: "message" } } },
    ],
    [
      "without moderation",
      "staticman.yaml",
      { comments: { moderation: false } },
    ],
  ])("%s", async (description, filename, format) => {
    const conf = _.merge(createDefaultConfig(), format);
    registerConfigFile(filename, conf);

    const sm = new Staticman({ remoteConfigFile: filename });
    expect(sm.process(requestParameters, bodyRequest)).resolves.toBeTrue();

    unregisterConfigFile(filename);
  });
});
