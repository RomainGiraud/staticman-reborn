import { expect, test, beforeAll, afterEach, afterAll } from "bun:test";
import { GitHub } from "./GitHub";
import { Parameters } from "./Utils";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const handlers = [
  http.get(
    "https://api.github.com/repos/:owner/:repo/contents/*",
    async ({ params }) => {
      const { owner, repo } = params;

      const content =
        "ewogICAgIm5hbWUiOiAiUHl0aG9uIiwKICAgICJ5ZWFyX2xhdW5jaGVkIjogMTk5MSwKICAgICJmb3VuZGVyIjogIkd1aWRvIHZhbiBSb3NzdW0iLAogICAgInByaW1hcnlfdXNlX2Nhc2VzIjogIldlYiBEZXZlbG9wbWVudCwgRGF0YSBBbmFseXNpcywgQXJ0aWZpY2lhbCBJbnRlbGxpZ2VuY2UsIFNjaWVudGlmaWMgQ29tcHV0aW5nIgp9";
      return HttpResponse.json({
        name: "config.json",
        path: `${owner}/${repo}/config.json`,
        type: "file",
        size: content.length,
        encoding: "base64",
        content,
      });
    },
  ),
];

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

test("Read a file", async () => {
  const params: Parameters = {
    service: "github",
    username: "myusername",
    project: "myproject",
    branch: "mybranch",
    property: "myproperty",
  };
  const gh = new GitHub("personaltoken", params);
  expect(gh.readFile("src/config.json")).resolves.toEqual({
    name: "Python",
    year_launched: 1991,
    founder: "Guido van Rossum",
    primary_use_cases:
      "Web Development, Data Analysis, Artificial Intelligence, Scientific Computing",
  });
});
