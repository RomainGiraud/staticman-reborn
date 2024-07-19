import { expect, test, beforeAll, afterEach, afterAll } from "bun:test";
import { GitLab } from "./GitLab";
import { Parameters } from "./Utils";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const handlers = [
  http.get(
    "https://gitlab.com/api/v4/projects/:id/repository/files/:file_path",
    async ({ params }) => {
      const { file_path } = params;

      const content =
        "ewogICAgIm5hbWUiOiAiUHl0aG9uIiwKICAgICJ5ZWFyX2xhdW5jaGVkIjogMTk5MSwKICAgICJmb3VuZGVyIjogIkd1aWRvIHZhbiBSb3NzdW0iLAogICAgInByaW1hcnlfdXNlX2Nhc2VzIjogIldlYiBEZXZlbG9wbWVudCwgRGF0YSBBbmFseXNpcywgQXJ0aWZpY2lhbCBJbnRlbGxpZ2VuY2UsIFNjaWVudGlmaWMgQ29tcHV0aW5nIgp9";
      return HttpResponse.json({
        file_name: file_path,
        file_path: file_path,
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
    service: "gitlab",
    username: "myusername",
    project: "myproject",
    branch: "mybranch",
    property: "myproperty",
  };
  const gl = new GitLab("personaltoken", params);
  expect(gl.readFile("src/config.json")).resolves.toEqual({
    name: "Python",
    year_launched: 1991,
    founder: "Guido van Rossum",
    primary_use_cases:
      "Web Development, Data Analysis, Artificial Intelligence, Scientific Computing",
  });
});
