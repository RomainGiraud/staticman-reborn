import { GitLab } from "./GitLab";
import { Parameters, createDate } from "./Utils";
import objectPath from "object-path";
import moment from "moment";
import YAML from "yaml";
import { type Static } from "elysia";

import { Config } from "./Config";
import * as transformers from "./Transformers";
import {
  ParseRemoteConfig,
  SitePropertySchema,
  BodyRequest,
  BodyElement,
  SiteTransforms,
} from "./SiteConfig";

export interface StaticmanOptions {
  gitlabToken?: string;
  remoteConfigFile?: string;
  siteConfig?: Static<typeof SitePropertySchema>;
}

export default class Staticman {
  private uuid: string;
  private bodyRequest = {};
  private siteConfig?: Static<typeof SitePropertySchema>;

  private gitlabToken: string | null;
  private remoteConfigFile: string;

  constructor(options?: Partial<StaticmanOptions>) {
    this.uuid = crypto.randomUUID();
    this.gitlabToken = options?.gitlabToken || Config.get("gitlabToken");
    this.remoteConfigFile = options?.remoteConfigFile || "staticman.yaml";
    this.siteConfig = options?.siteConfig;
  }

  private validateFields(
    fields: Static<typeof BodyElement>,
  ): Static<typeof BodyElement> {
    if (this.siteConfig === undefined) {
      throw new Error("siteConfig is undefined");
    }

    const allowed: string[] = this.siteConfig.allowedFields;
    const newFields: Static<typeof BodyElement> = {};
    Object.keys(fields).forEach((field: keyof Static<typeof BodyElement>) => {
      const value = fields[field];
      if (!allowed.includes(field as string)) return;

      newFields[field] = value;
    });

    const keys = Object.keys(newFields);
    const required: string[] = this.siteConfig.requiredFields;
    required.forEach((field) => {
      if (!keys.includes(field)) {
        throw new Error(`Missing required field ${field}`);
      }
    });

    return newFields;
  }

  private generateFields(
    fields: Static<typeof BodyElement>,
  ): Static<typeof BodyElement> {
    if (this.siteConfig === undefined) {
      throw new Error("siteConfig is undefined");
    }

    const generatedFields = this.siteConfig.generatedFields;

    Object.keys(generatedFields).forEach((field) => {
      const generatedField = generatedFields[field];

      switch (generatedField.type) {
        case "date":
          fields[field] = createDate(generatedField.format);
          break;

        // TODO: Remove 'github' when v2 API is no longer supported
        // case "github":
        // case "user":
        //   if (this.gitUser && typeof options.property === "string") {
        //     data[field] = objectPath.get(this.gitUser, options.property);
        //   }
        //   break;

        // case "slugify":
        //   if (typeof options.field === "string" && typeof fields[options.field] === "string") {
        //     fields[field] = slug(fields[options.field]).toLowerCase();
        //   }
        //   break;

        case "literal":
          fields[field] = generatedField.value;
          break;
      }
    });

    return fields;
  }

  private applyTransforms(
    fields: Static<typeof BodyElement>,
  ): Static<typeof BodyElement> {
    if (this.siteConfig === undefined) {
      throw new Error("siteConfig is undefined");
    }

    const transforms: Static<typeof SiteTransforms> =
      this.siteConfig.transforms;

    const newFields: Static<typeof BodyElement> = {};
    Object.keys(fields).forEach((field) => {
      let value = fields[field];

      if (field in transforms) {
        const fieldTransforms = transforms[field];
        Array<string>()
          .concat(fieldTransforms)
          .forEach((transform) => {
            Object.values(transformers).forEach((tr) => {
              if (transform == tr.name) {
                value = tr(value);
              }
            });
          });
      }

      newFields[field] = value;
    });

    return newFields;
  }

  private generateFile(fields: Static<typeof BodyElement>): [string, string] {
    if (this.siteConfig === undefined) {
      throw new Error("siteConfig is undefined");
    }

    const transforms: Static<typeof SiteTransforms> =
      this.siteConfig.transforms;

    let extension: string;
    let content: string;
    switch (this.siteConfig.format) {
      case "yml":
      case "yaml":
        // http://yaml.org/faq.html
        extension = "yaml";
        content = YAML.stringify(fields);
        break;
      case "json":
        extension = "json";
        content = JSON.stringify(fields);
        break;
      case "frontmatter":
        {
          extension = "md";
          const contentField = Object.keys(transforms).find((field) => {
            return Array<string>()
              .concat(transforms[field])
              .includes("frontmatterContent");
          });

          if (!contentField) {
            throw new Error("NO_FRONTMATTER_CONTENT_TRANSFORM");
          }

          const contentFM = fields[contentField];
          const attributeFields = { ...fields };
          delete attributeFields[contentField];

          content = `---\n${YAML.stringify(attributeFields)}---\n${contentFM}\n`;
        }
        break;
      default:
        throw new Error("Invalid type format");
    }

    const dirpath = this.resolvePlaceholder(
      this.siteConfig.path,
      this.bodyRequest,
    );
    const filename = this.resolvePlaceholder(
      this.siteConfig.filename,
      this.bodyRequest,
    );
    const path = `${dirpath}/${filename}.${extension}`;

    return [path, content];
  }

  async process(
    params: Parameters,
    bodyRequest: Static<typeof BodyRequest>,
  ): Promise<boolean> {
    this.bodyRequest = bodyRequest;

    if (this.gitlabToken === null) {
      return false;
    }

    const gl = new GitLab(this.gitlabToken, params);
    const remoteConfigObject = await gl.readFile(this.remoteConfigFile);

    let remoteConfig;
    try {
      remoteConfig = ParseRemoteConfig(remoteConfigObject);
    } catch (error) {
      throw new Error(`Remote config file is invalid: ${error}`);
    }

    const prop = params.property;
    if (!(prop in remoteConfig)) {
      throw new Error("Server is under maintainance");
    }

    this.siteConfig = remoteConfig[prop];
    if (this.siteConfig.branch !== params.branch) {
      throw new Error("branch name does not match.");
    }

    let fields = bodyRequest.fields;
    fields = this.validateFields(fields);
    fields = this.generateFields(fields);
    fields = this.resolvePlaceholders(fields);
    fields = this.applyTransforms(fields);
    if ("parent" in bodyRequest["options"]) {
      fields["parent"] = bodyRequest["options"]["parent"];
      if (!isNaN(Number(fields["parent"]))) {
        fields["parent"] = Number(fields["parent"]);
      }
    }
    const [filepath, content] = this.generateFile(fields);

    const commitMessage = this.resolvePlaceholder(
      this.siteConfig.commitMessage,
      this.bodyRequest,
    );

    if (this.siteConfig.moderation) {
      await gl.writeFileAndSendReview(
        filepath,
        content,
        commitMessage,
        `staticman_${this.uuid}`,
      );
    } else {
      await gl.writeFile(filepath, content, commitMessage);
    }

    return true;
  }

  private resolvePlaceholder(subject: string, baseObject: object): string {
    const matches = subject.match(/{(.*?)}/g);
    matches?.forEach((match) => {
      const escapedMatch = match.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
      const property = match.slice(1, -1);

      let newText: string;
      switch (property) {
        case "@timestamp":
          newText = new Date().getTime().toString();

          break;

        case "@id":
          newText = this.uuid;

          break;

        default: {
          const timeIdentifier = "@date:";

          if (property.indexOf(timeIdentifier) === 0) {
            const timePattern = property.slice(timeIdentifier.length);
            newText = moment().format(timePattern);
          } else {
            newText = objectPath.get(baseObject, property) || "";
          }
        }
      }

      subject = subject.replace(new RegExp(escapedMatch, "g"), newText);
    });

    return subject;
  }

  private resolvePlaceholders(
    fields: Static<typeof BodyElement>,
  ): Static<typeof BodyElement> {
    const newFields: Static<typeof BodyElement> = {};
    Object.keys(fields).forEach((field) => {
      if (typeof fields[field] !== "string") {
        throw new Error(`field ${field} is not a string`);
      }
      newFields[field] = this.resolvePlaceholder(
        fields[field],
        this.bodyRequest,
      );
    });
    return newFields;
  }
}
