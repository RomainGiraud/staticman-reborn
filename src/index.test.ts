import {
  expect,
  describe,
  test,
  beforeAll,
  afterEach,
  afterAll,
} from "bun:test";
import { type Static } from "elysia";
import { app } from "./index";
import { BodyRequest } from "./SiteConfig";
import { setupServer } from "./mocks/Bun";
import * as gitlabMocks from "./mocks/GitLab";
import * as githubMocks from "./mocks/GitHub";

const server = setupServer(...gitlabMocks.handlers, ...githubMocks.handlers);
beforeAll(() => server.enable());
afterEach(() => server.resetHandlers());
afterAll(() => server.disable());

function appendGroup(
  formData: FormData,
  group: string,
  values: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      formData.append(`${group}[${key}]`, String(value));
    }
  }
}

// Mirrors the field names used by post.sample.html, so this reproduces
// exactly what a browser sends when a visitor submits the comment form.
function buildFormData(bodyRequest: Static<typeof BodyRequest>): FormData {
  const formData = new FormData();
  appendGroup(formData, "options", bodyRequest.options);
  appendGroup(formData, "fields", bodyRequest.fields);
  return formData;
}

describe.each([
  ["GitLab", gitlabMocks],
  ["GitHub", githubMocks],
])("Submitting the comment form (%s)", (_service, mock) => {
  test("redirects on success", async () => {
    mock.registerConfigFile("staticman.yaml", mock.createDefaultConfig());

    const { service, username, project, branch, property } =
      mock.requestParameters;
    const response = await app.handle(
      new Request(
        `http://localhost/entry/v1/${service}/${username}/${project}/${branch}/${property}`,
        {
          method: "POST",
          body: buildFormData(mock.submittedForm),
        },
      ),
    );

    mock.unregisterConfigFile("staticman.yaml");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      String(mock.submittedForm.options.redirect),
    );
  });
});

describe("Invalid requests", () => {
  test("returns an error when the body does not match the schema", async () => {
    const { service, username, project, branch, property } =
      gitlabMocks.requestParameters;
    const response = await app.handle(
      new Request(
        `http://localhost/entry/v1/${service}/${username}/${project}/${branch}/${property}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ unexpected: true }),
        },
      ),
    );

    const json = (await response.json()) as { error?: string };
    expect(typeof json.error).toBe("object");
  });
});
