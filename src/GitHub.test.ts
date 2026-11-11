import { expect, test, beforeAll, afterEach, afterAll } from "bun:test";
import { GitHub } from "./GitHub";
import { http, HttpResponse } from "msw";
import { Config } from "./Config";
import { type Parameters } from "./SiteConfig";
import { setupServer } from "./mocks/Bun";

const handlers = [
  http.get(
    "https://api.github.com/repos/:owner/:repo/contents/:file_path",
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
beforeAll(() => server.enable());
afterEach(() => server.resetHandlers());
afterAll(() => server.disable());

test("Read a file", async () => {
  const params: Parameters = {
    service: "mygithub",
    username: "myusername",
    project: "myproject",
    branch: "mybranch",
    property: "myproperty",
  };
  const gh = new GitHub(
    params,
    Config.get("services").find((s) => s.name === params.service)!,
  );
  expect(gh.readFile("src/config.json")).resolves.toEqual({
    name: "Python",
    year_launched: 1991,
    founder: "Guido van Rossum",
    primary_use_cases:
      "Web Development, Data Analysis, Artificial Intelligence, Scientific Computing",
  });
});
