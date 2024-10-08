import { expect, test } from "bun:test";
import YAML from "yaml";
import { ParseRemoteConfig } from "./SiteConfig";

test("Read remote config", async () => {
  const content = `comments:
  allowedFields: ["name", "email", "message"]
  branch: "main"
  commitMessage: "New comment in {options.slug}"
  filename: "comment-{@timestamp}"
  format: "yaml"
  generatedFields:
    date:
      type: date
      format: iso8601
  moderation: true
  name: "mysite.org"
  path: "comments/{options.slug}"
  requiredFields: ["name", "email", "message"]
  transforms:
    name: [rmCR, escapeHTML]
    email: "encrypt"
    message: [rmCR, escapeHTML]`;
  const obj = YAML.parse(content);

  expect(ParseRemoteConfig(obj)).toEqual({
    comments: {
      allowedFields: ["name", "email", "message"],
      branch: "main",
      commitMessage: "New comment in {options.slug}",
      filename: "comment-{@timestamp}",
      format: "yaml",
      generatedFields: {
        date: {
          type: "date",
          format: "iso8601",
        },
      },
      moderation: true,
      name: "mysite.org",
      path: "comments/{options.slug}",
      requiredFields: ["name", "email", "message"],
      transforms: {
        name: ["rmCR", "escapeHTML"],
        email: "encrypt",
        message: ["rmCR", "escapeHTML"],
      },
    },
  });
});
