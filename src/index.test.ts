import { expect, test, beforeAll, afterEach, afterAll } from "bun:test";
import { setupServer } from "msw/node";
import { app } from "./index";
import {
  handlers,
  requestParameters,
  bodyRequest,
  registerConfigFile,
  unregisterConfigFile,
  createDefaultConfig,
} from "./mocks/gitlab";

const server = setupServer(...handlers);

beforeAll(() =>
  server.listen({
    onUnhandledRequest: "error",
  }),
);

afterEach(() => server.resetHandlers());

afterAll(() => server.close());

// Mirrors the field names used by post.sample.html, so this reproduces
// exactly what a browser sends when a visitor submits the comment form.
function buildFormData(): FormData {
  const formData = new FormData();
  formData.append("options[redirect]", bodyRequest.options.redirect);
  formData.append("options[parent]", bodyRequest.options.parent);
  formData.append("options[slug]", bodyRequest.options.slug);
  formData.append("fields[name]", bodyRequest.fields.name);
  formData.append("fields[email]", bodyRequest.fields.email);
  formData.append("fields[message]", bodyRequest.fields.message);
  return formData;
}

test("submitting the comment form redirects on success", async () => {
  registerConfigFile("staticman.yaml", createDefaultConfig());

  const { service, username, project, branch, property } = requestParameters;
  const response = await app.handle(
    new Request(
      `http://localhost/entry/v1/${service}/${username}/${project}/${branch}/${property}`,
      {
        method: "POST",
        body: buildFormData(),
      },
    ),
  );

  unregisterConfigFile("staticman.yaml");

  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(bodyRequest.options.redirect);
});
