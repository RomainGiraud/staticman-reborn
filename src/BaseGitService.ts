import { GitError } from "./BaseError";
import YAML from "yaml";
import { Parameters } from "./Utils";
import { GitService } from "./GitService";

export interface RemoteFile {
  content: string;
  encoding: string;
}

export abstract class BaseGitService implements GitService {
  constructor(
    protected readonly parameters: Parameters,
    private readonly errorPrefix: string,
  ) {}

  protected abstract fetchFile(path: string): Promise<RemoteFile>;
  protected abstract getBranchHeadCommit(branch: string): Promise<string>;
  protected abstract createBranch(branch: string, sha: string): Promise<void>;
  protected abstract commitFile(
    path: string,
    content: string,
    commitMessage: string,
    branch: string,
  ): Promise<void>;
  protected abstract createReview(
    reviewTitle: string,
    branch: string,
    reviewBody: string,
  ): Promise<void>;

  async readFile(path: string): Promise<unknown> {
    const extension = path.split(".").pop();
    const file = await this.fetchFile(path);

    let content: string;
    if (file.encoding === "base64") {
      try {
        content = Buffer.from(file.content, "base64").toString();
      } catch (err) {
        throw new GitError(`${this.errorPrefix}_READING_FILE`, {
          cause: err,
        });
      }
    } else {
      throw new GitError(`${this.errorPrefix}_READING_FILE`, {
        err: `Unknown encoding ${file.encoding}`,
      });
    }

    try {
      switch (extension) {
        case "yml":
        case "yaml":
          return YAML.parse(content);

        case "json":
          return JSON.parse(content);

        default:
          throw new Error(`Unknown extension ${extension}`);
      }
    } catch (err) {
      throw new GitError("PARSING_ERROR", { cause: err });
    }
  }

  async writeFileAndSendReview(
    path: string,
    content: string,
    commitMessage: string,
    branch: string,
    reviewBody: string = "",
  ): Promise<void> {
    return this.getBranchHeadCommit(this.parameters.branch)
      .then((sha) => this.createBranch(branch, sha))
      .then(() => this.commitFile(path, content, commitMessage, branch))
      .then(() => this.createReview(commitMessage, branch, reviewBody));
  }

  async writeFile(
    path: string,
    content: string,
    commitMessage: string,
  ): Promise<void> {
    return this.commitFile(
      path,
      content,
      commitMessage,
      this.parameters.branch,
    );
  }
}
