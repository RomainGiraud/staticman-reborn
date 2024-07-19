import { expect, test } from "bun:test";
import YAML from "yaml";
import fs from "fs";
import { ParseRemoteConfig } from "./SiteConfig";

test("Read a file", async () => {
  let content = fs.readFileSync('staticman.test.yaml', 'utf8');
  let obj = YAML.parse(content);

  expect(ParseRemoteConfig(obj)).toEqual({
    success: true,
    data: {
      "comments": {
        allowedFields: ["name", "email", "message"],
        branch: "main",
        commitMessage: "New comment in {options.slug}",
        filename: "comment-{@timestamp}",
        format: "yaml",
        generatedFields: {
          date: {
            type: "date",
            format: "iso8601",
          }
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
      }
    }
  });
});
