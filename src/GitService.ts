export interface GitService {
  readFile(path: string): Promise<unknown>;

  writeFileAndSendReview(
    path: string,
    content: string,
    commitMessage: string,
    branch: string,
    reviewBody?: string,
  ): Promise<void>;

  writeFile(
    path: string,
    content: string,
    commitMessage: string,
  ): Promise<void>;
}
