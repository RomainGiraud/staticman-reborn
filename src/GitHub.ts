import { Octokit } from "@octokit/rest";
import { GitError } from "./BaseError";
import YAML from "yaml";
import { Parameters } from "./Utils";
import { GitService } from "./GitService";

export class GitHub implements GitService {
  private api: Octokit;
  private parameters: Parameters;
  private owner: string;
  private repo: string;

  constructor(token: string, parameters: Parameters) {
    this.parameters = parameters;
    this.api = new Octokit({
      auth: token,
    });

    this.owner = this.parameters.username;
    this.repo = this.parameters.project;
  }

  async readFile(path: string): Promise<unknown> {
    const extension = path.split(".").pop();
    const res = await this.api.rest.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref: this.parameters.branch,
    });

    if (Array.isArray(res.data) || !("content" in res.data)) {
      throw new GitError("GITHUB_READING_FILE", {
        err: `${path} is not a file`,
      });
    }

    let content;
    if (res.data.encoding === "base64") {
      try {
        content = Buffer.from(res.data.content, "base64").toString();
      } catch (err) {
        throw new GitError("GITHUB_READING_FILE", { cause: err });
      }
    } else {
      throw new GitError("GITHUB_READING_FILE", {
        err: `Unknown encoding ${res.data.encoding}`,
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

    return content;
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

  private async getBranchHeadCommit(branch: string): Promise<string> {
    return this.api.rest.repos
      .getBranch({ owner: this.owner, repo: this.repo, branch })
      .then((res) => res.data.commit.sha);
  }

  private async createBranch(branch: string, sha: string): Promise<void> {
    return this.api.rest.git
      .createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branch}`,
        sha,
      })
      .then(() => {});
  }

  private async commitFile(
    path: string,
    content: string,
    commitMessage: string,
    branch: string,
  ): Promise<void> {
    return this.api.rest.repos
      .createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: commitMessage,
        content: Buffer.from(content).toString("base64"),
        branch,
      })
      .then(() => {});
  }

  private async createReview(
    reviewTitle: string,
    branch: string,
    reviewBody: string,
  ): Promise<void> {
    return this.api.rest.pulls
      .create({
        owner: this.owner,
        repo: this.repo,
        title: reviewTitle,
        head: branch,
        base: this.parameters.branch,
        body: reviewBody,
      })
      .then(() => {});
  }
}
