import { type Static } from "elysia";
import YAML from "yaml";
import { BodyRequest, SiteConfigSchema } from "../SiteConfig";
import * as transfomers from "../Transformers";
import { parseFrontmatter } from "../Utils";

type SiteConfig = Static<typeof SiteConfigSchema>;

export const submittedForm: Static<typeof BodyRequest> = {
  fields: {
    name: "Romain",
    email: "romain@example.org",
    message: "Hello, everything works fine!",
  },
  options: {
    redirect: "http://google.com/",
    parent: "123",
    slug: "my-post",
  },
};

export function createConfigRegistry() {
  const configFiles: Record<string, SiteConfig> = {};

  return {
    configFiles,
    registerConfigFile(name: string, conf: SiteConfig) {
      if (name in configFiles) {
        throw new Error(`Config file ${name} already exists`);
      }
      configFiles[name] = conf;
    },
    unregisterConfigFile(name: string) {
      if (!(name in configFiles)) {
        throw new Error(`Config file ${name} does not exist`);
      }
      delete configFiles[name];
    },
  };
}

/**
 * Checks that a created file matches the comment submitted in `submittedForm`.
 */
export function isExpectedComment(
  filePath: string,
  base64Content: string,
  commitMessage: string | undefined,
): boolean {
  const contentDecoded = Buffer.from(base64Content, "base64").toString("utf8");
  const fileExtension = filePath.split(".").pop();

  let content: Record<string, string | number> = {};
  content["message"] = "";
  switch (fileExtension) {
    case "yaml":
      content = YAML.parse(contentDecoded);
      break;
    case "json":
      content = JSON.parse(contentDecoded);
      break;
    case "md":
      content = parseFrontmatter(contentDecoded);
      break;
  }

  const regex = new RegExp(
    String.raw`^comments\/my-post\/comment-\d+\.${fileExtension}$`,
  );
  return !(
    !regex.test(filePath) ||
    commitMessage != "New comment in my-post" ||
    content?.name != submittedForm.fields.name ||
    content === undefined ||
    content.email === undefined ||
    typeof content.email !== "string" ||
    transfomers.decrypt(content.email) != submittedForm.fields.email ||
    content?.message != submittedForm.fields.message ||
    content?.parent != submittedForm.options.parent
  );
}

export function createDefaultConfig(): SiteConfig {
  return {
    comments: {
      allowedFields: ["name", "email", "message"],
      requiredFields: ["name", "email", "message"],
      branch: "main",
      path: "comments/{options.slug}",
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
      transforms: {
        name: ["rmCR", "escapeHTML"],
        email: "encrypt",
        message: ["rmCR", "escapeHTML"],
      },
    },
  };
}
