import { Octokit } from "@octokit/rest";
import { GitError } from "./BaseError";
import { Parameters } from "./Utils";
import { BaseGitService, RemoteFile } from "./BaseGitService";

export class GitHub extends BaseGitService {
  private api: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, parameters: Parameters) {
    super(parameters, "GITHUB");
    this.api = new Octokit({
      auth: token,
    });

    this.owner = parameters.username;
    this.repo = parameters.project;
  }

  protected async fetchFile(path: string): Promise<RemoteFile> {
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

    return { content: res.data.content, encoding: res.data.encoding };
  }

  protected async getBranchHeadCommit(branch: string): Promise<string> {
    return this.api.rest.repos
      .getBranch({ owner: this.owner, repo: this.repo, branch })
      .then((res) => res.data.commit.sha);
  }

  protected async createBranch(branch: string, sha: string): Promise<void> {
    return this.api.rest.git
      .createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branch}`,
        sha,
      })
      .then(() => {});
  }

  protected async commitFile(
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

  protected async createReview(
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
