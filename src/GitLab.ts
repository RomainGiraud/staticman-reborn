import { Gitlab as GitlabRest } from "@gitbeaker/rest";
import { GitError } from "./BaseError";
import YAML from "yaml";
import { Parameters } from "./Utils";

export class GitLab {
  private api: InstanceType<typeof GitlabRest>;
  private parameters: Parameters;
  private repositoryId: string;

  constructor(token: string, parameters: Parameters) {
    this.parameters = parameters;
    this.api = new GitlabRest({
      host: "https://gitlab.com",
      token,
    });

    this.repositoryId = `${this.parameters.username}/${this.parameters.project}`;
  }

  async readFile(
    path: string,
    getFullResponse: boolean = false,
  ): Promise<{ [index: string]: any }> {
    const extension = path.split(".").pop();
    const res = await this.api.RepositoryFiles.show(
      this.repositoryId,
      path,
      this.parameters.branch,
    );

    let content;
    if (res.encoding === "base64") {
      try {
        content = Buffer.from(res.content, "base64").toString();
      } catch (err) {
        throw new GitError("GITLAB_READING_FILE", { cause: err });
      }
    } else {
      throw new GitError("GITLAB_READING_FILE", {
        err: `Unknown encoding ${res.encoding}`,
      });
    }

    try {
      switch (extension) {
        case "yml":
        case "yaml":
          content = YAML.parse(content);
          break;

        case "json":
          content = JSON.parse(content);
          break;

        default:
          throw new Error(`Unknown extension ${extension}`);
      }
    } catch (err) {
      throw new GitError("PARSING_ERROR", { cause: err });
    }

    if (getFullResponse) {
      return {
        content,
        file: {
          content: res.content,
        },
      };
    }
    return content;
  }

  async commitFile(
    path: string,
    content: string,
    commitMessage: string,
    branch: string,
  ): Promise<void> {
    console.log(`Commit file ${path} to ${branch}:`);
    console.log(`  Commit message: ${commitMessage}`);
    console.log(`  Content: ${content}`);
    return;
    return this.api.RepositoryFiles.create(
      this.repositoryId,
      path,
      branch,
      Buffer.from(content).toString("base64"),
      commitMessage,
      { encoding: "base64" },
    ).then(() => {});
  }
}
