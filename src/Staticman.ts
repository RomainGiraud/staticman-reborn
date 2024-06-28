import { GitLab } from "./GitLab";
import {
  Parameters,
  BodyRequest,
  Fields,
  Transforms,
  createDate,
} from "./Utils";
import NodeRSA from "node-rsa";
import objectPath from "object-path";
import moment from "moment";
import YAML from "yaml";

import Config from "./Config";
import SiteConfig from "./SiteConfig";
import * as transformers from "./Transformers";

const gitlabToken = "XXXXXXXXXXXXXX";
const remoteConfigFile = "staticman.yml";

const rsa = new NodeRSA();
rsa.importKey(Config.get("rsaPrivateKey"), "private");

export default class Staticman {
  private uuid: string;
  private bodyRequest: BodyRequest = {};
  private siteConfig: any; // TODO

  constructor() {
    this.uuid = crypto.randomUUID();
  }

  private validateFields(fields: Fields): Fields {
    const allowed: string[] = this.siteConfig.get("allowedFields") as string[];
    const newFields: Fields = {};
    Object.keys(fields).forEach((field: keyof Fields) => {
      const value = fields[field];
      if (!allowed.includes(field as string)) return;

      newFields[field] = value;
    });

    const keys = Object.keys(newFields);
    const required: string[] = this.siteConfig.get(
      "requiredFields",
    ) as string[];
    required.forEach((field) => {
      if (!keys.includes(field)) {
        throw new Error(`Missing required field ${field}`);
      }
    });

    return newFields;
  }

  private generateFields(fields: Fields): Fields {
    const generatedFields = this.siteConfig.get("generatedFields");

    Object.keys(generatedFields).forEach((field) => {
      const generatedField = generatedFields[field];

      if (
        typeof generatedField === "object" &&
        !(generatedField instanceof Array)
      ) {
        const options = generatedField.options || {};

        switch (generatedField.type) {
          case "date":
            fields[field] = createDate(options);
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

          default:
            throw new Error(`Invalid type ${generatedField.type}`);
        }
      } else {
        fields[field] = generatedField;
      }
    });

    return fields;
  }

  private applyTransforms(fields: Fields): Fields {
    const transforms: Transforms = this.siteConfig.get("transforms");

    const newFields: Fields = {};
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

  private generateFile(fields: Fields): [string, string] {
    const transforms: Transforms = this.siteConfig.get("transforms");

    let extension: string;
    let content: string;
    switch (this.siteConfig.get("format")) {
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
      case "frontmatter": {
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
      this.siteConfig.get("path"),
      this.bodyRequest,
    );
    const filename = this.resolvePlaceholder(
      this.siteConfig.get("filename"),
      this.bodyRequest,
    );
    const path = `${dirpath}/${filename}.${extension}`;

    return [path, content];
  }

  async process(params: Parameters, bodyRequest: BodyRequest) {
    const gl = new GitLab(gitlabToken, params);
    const remoteConfig = await gl.readFile(remoteConfigFile);

    const prop = params.property.toString();
    if (!(prop in remoteConfig)) {
      throw new Error("Server is under maintainance");
    }

    this.siteConfig = SiteConfig(remoteConfig[prop], rsa);
    if (this.siteConfig.get("branch") !== params.branch) {
      throw new Error("branch name does not match.");
    }

    this.bodyRequest = bodyRequest as BodyRequest;

    let fields = bodyRequest["fields"];
    fields = this.validateFields(fields);
    fields = this.generateFields(fields);
    fields = this.resolvePlaceholders(fields);
    fields = this.applyTransforms(fields);
    const [filepath, content] = this.generateFile(fields);

    const commitMessage = this.resolvePlaceholder(
      this.siteConfig.get("commitMessage"),
      this.bodyRequest,
    );

    const targetBranch = this.siteConfig.get("moderation")
      ? `staticman_${this.uuid}`
      : params.branch;
    await gl.writeFileAndSendReview(
      filepath,
      content,
      commitMessage,
      targetBranch,
    );
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

  private resolvePlaceholders(fields: Fields): Fields {
    const newFields: Fields = {};
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
