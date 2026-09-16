import { Gitlab as GitlabRest } from "@gitbeaker/rest";
import { Parameters } from "./Utils";
import { BaseGitService, RemoteFile } from "./BaseGitService";

export class GitLab extends BaseGitService {
  private api: InstanceType<typeof GitlabRest>;
  private repositoryId: string;

  constructor(token: string, parameters: Parameters) {
    super(parameters, "GITLAB");
    this.api = new GitlabRest({
      host: "https://gitlab.com",
      token,
    });

    this.repositoryId = `${parameters.username}/${parameters.project}`;
  }

  protected async fetchFile(path: string): Promise<RemoteFile> {
    const res = await this.api.RepositoryFiles.show(
      this.repositoryId,
      path,
      this.parameters.branch,
    );

    return { content: res.content, encoding: res.encoding };
  }

  protected async getBranchHeadCommit(branch: string): Promise<string> {
    return this.api.Branches.show(this.repositoryId, branch).then(
      (res) => res.commit.id,
    );
  }

  protected async createBranch(branch: string, sha: string): Promise<void> {
    return this.api.Branches.create(this.repositoryId, branch, sha).then(
      () => {},
    );
  }

  protected async commitFile(
    path: string,
    content: string,
    commitMessage: string,
    branch: string,
  ): Promise<void> {
    return this.api.RepositoryFiles.create(
      this.repositoryId,
      path,
      branch,
      Buffer.from(content).toString("base64"),
      commitMessage,
      { encoding: "base64" },
    ).then(() => {});
  }

  protected async createReview(
    reviewTitle: string,
    branch: string,
    reviewBody: string,
  ): Promise<void> {
    return this.api.MergeRequests.create(
      this.repositoryId,
      branch,
      this.parameters.branch,
      reviewTitle,
      {
        description: reviewBody,
        removeSourceBranch: true,
      },
    ).then(() => {});
  }
}
