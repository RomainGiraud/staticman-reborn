import {
  expect,
  describe,
  test,
  beforeAll,
  afterEach,
  afterAll,
} from "bun:test";
import { setupServer } from "msw/node";
import { app } from "./index";
import * as gitlabMocks from "./mocks/gitlab";
import * as githubMocks from "./mocks/github";

const server = setupServer(...gitlabMocks.handlers, ...githubMocks.handlers);

beforeAll(() =>
  server.listen({
    onUnhandledRequest: "error",
  }),
);

afterEach(() => server.resetHandlers());

afterAll(() => server.close());

// Mirrors the field names used by post.sample.html, so this reproduces
// exactly what a browser sends when a visitor submits the comment form.
function buildFormData(bodyRequest: typeof gitlabMocks.bodyRequest): FormData {
  const formData = new FormData();
  formData.append("options[redirect]", bodyRequest.options.redirect);
  formData.append("options[parent]", bodyRequest.options.parent);
  formData.append("options[slug]", bodyRequest.options.slug);
  formData.append("fields[name]", bodyRequest.fields.name);
  formData.append("fields[email]", bodyRequest.fields.email);
  formData.append("fields[message]", bodyRequest.fields.message);
  return formData;
}

describe.each([
  ["GitLab", gitlabMocks],
  ["GitHub", githubMocks],
])("Submitting the comment form (%s)", (_service, mocks) => {
  test("redirects on success", async () => {
    mocks.registerConfigFile("staticman.yaml", mocks.createDefaultConfig());

    const { service, username, project, branch, property } =
      mocks.requestParameters;
    const response = await app.handle(
      new Request(
        `http://localhost/entry/v1/${service}/${username}/${project}/${branch}/${property}`,
        {
          method: "POST",
          body: buildFormData(mocks.bodyRequest),
        },
      ),
    );

    mocks.unregisterConfigFile("staticman.yaml");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      mocks.bodyRequest.options.redirect,
    );
  });
});
