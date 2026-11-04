import { GitLab } from "./GitLab";
import { GitHub } from "./GitHub";
import { type GitService } from "./GitService";
import { createDate } from "./Utils";
import objectPath from "object-path";
import moment from "moment";
import YAML from "yaml";
import { type Static } from "elysia";

import * as transformers from "./Transformers";
import {
  ParseRemoteConfig,
  SitePropertySchema,
  BodyRequest,
  BodyElement,
  SiteTransforms,
  type Parameters,
} from "./SiteConfig";
import { logger } from "./Logger";

export interface StaticmanOptions {
  remoteConfigFile?: string;
  siteConfig?: Static<typeof SitePropertySchema>;
}

export default class Staticman {
  private uuid: string;
  private bodyRequest = {};
  private siteConfig?: Static<typeof SitePropertySchema>;

  private remoteConfigFile: string;

  constructor(options?: Partial<StaticmanOptions>) {
    this.uuid = crypto.randomUUID();
    this.remoteConfigFile = options?.remoteConfigFile || "staticman.yaml";
    this.siteConfig = options?.siteConfig;
  }

  private createGitService(params: Parameters): GitService {
    const factories = {
      gitlab: (p: Parameters) => new GitLab(p),
      github: (p: Parameters) => new GitHub(p),
    };

    if (!factories[params.service]) {
      throw new Error(`Unsupported service: ${params.service}`);
    }

    return factories[params.service](params);
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

      if (value === undefined) return;

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
      if (generatedField === undefined) return;

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
      this.siteConfig.transforms || {};

    const newFields: Static<typeof BodyElement> = {};
    Object.keys(fields).forEach((field) => {
      let value = fields[field];
      if (value === undefined) {
        return;
      }

      if (field in transforms) {
        let fieldTransforms = transforms[field];
        if (fieldTransforms === undefined) fieldTransforms = [];
        Array<string>()
          .concat(fieldTransforms)
          .forEach((transform) => {
            Object.values(transformers).forEach((tr) => {
              if (transform == tr.name) {
                value = tr(value as string);
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

    let extension: string;
    let content: string;
    const format =
      typeof this.siteConfig.format === "string"
        ? this.siteConfig.format
        : this.siteConfig.format.type;
    switch (format) {
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
      case "md":
        {
          extension = "md";

          if (!(
            typeof this.siteConfig.format === "object" &&
            "content" in this.siteConfig.format
          )) {
            throw new Error("NO_FRONTMATTER_CONTENT");
          }

          content = fields[this.siteConfig.format.content] as string;
          delete fields[this.siteConfig.format.content];

          content = `---\n${YAML.stringify({ ...fields })}---\n${content}\n`;
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

    const git = this.createGitService(params);

    const remoteConfigObject = await git.readFile(this.remoteConfigFile);

    let remoteConfig;
    try {
      remoteConfig = ParseRemoteConfig(remoteConfigObject);
    } catch (error) {
      throw new Error(`Remote config file is invalid: ${error}`, {
        cause: error,
      });
    }

    const prop = params.property;
    if (!(prop in remoteConfig)) {
      throw new Error("Main property not found in remote config file.");
    }

    this.siteConfig = remoteConfig[prop];
    if (this.siteConfig?.branch !== params.branch) {
      throw new Error("Branch name does not match.");
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
    logger.debug(`filepath: ${filepath}`);

    const commitMessage = this.resolvePlaceholder(
      this.siteConfig.commitMessage,
      this.bodyRequest,
    );

    if (this.siteConfig.moderation) {
      await git.writeFileAndSendReview(
        filepath,
        content,
        commitMessage,
        `staticman_${this.uuid}`,
      );
    } else {
      await git.writeFile(filepath, content, commitMessage);
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
