import { GitLab } from "./GitLab";
import { Body, Fields, Parameters, resolvePlaceholder } from "./Utils";
import NodeRSA from "node-rsa";
import Config from "./Config";
import SiteConfig from "./SiteConfig";

const gitlabToken = "XXXXXXXXXXXXXX";
const remoteConfigFile = "staticman.yml";

const rsa = new NodeRSA();
rsa.importKey(Config.get("rsaPrivateKey"), "private");

export default class Staticman {
  constructor() {}

  async process(params: Parameters, body: Body) {
    const gl = new GitLab(gitlabToken, {
      service: params.service,
      username: params.username,
      project: params.project,
      branch: params.branch,
      property: params.property,
    });
    let remoteConfig = await gl.readFile(remoteConfigFile);

    const prop = params.property.toString();
    if (!(prop in remoteConfig)) {
      throw new Error("Server is during maintainance");
    }

    const bod: Body = body as Body;

    const cfg = SiteConfig(remoteConfig[prop], rsa);
    if (cfg.get("branch") !== params.branch) {
      throw new Error("branch name does not match.");
    }

    const dirpath = resolvePlaceholder(cfg.get("path"), bod);
    const filename = resolvePlaceholder(cfg.get("filename"), bod);
    const commitMessage = resolvePlaceholder(cfg.get("commitMessage"), bod);

    const allowed: string[] = cfg.get("allowedFields") as string[];

    const fields: Fields = bod["fields"] as unknown as Fields;
    const message: Fields = {};
    Object.keys(fields).forEach((field: keyof Fields) => {
      const value = fields[field];
      if (!allowed.includes(field as string)) return;

      message[field] = value;
    });

    const keys = Object.keys(message);
    const required: string[] = cfg.get("requiredFields") as string[];
    required.forEach((field) => {
      if (!keys.includes(field)) {
        throw new Error(`Missing required field ${field}`);
      }
    });

    const path = `${dirpath}/${filename}.yml`;
    console.log(path);
    // await gl.commitFile(path, YAML.stringify(message), commitMessage);
  }
}
