import { Gitlab as GitlabRest } from '@gitbeaker/rest';
import { GitError } from './BaseError';
import YAML from 'yaml'

interface Parameters {
  service: string;
  username: string;
  project: string;
  branch: string;
  property: string;
}

export class GitLab {
  private api: InstanceType<typeof GitlabRest>;
  private parameters: Parameters;

  constructor(token: string, parameters: Parameters) {
    this.parameters = parameters;
    this.api = new GitlabRest({
      host: "https://gitlab.com",
      token
    });
  }

  async readFile(path: string, getFullResponse: boolean = false): Promise<{[index: string]:any}> {
    const extension = path.split(".").pop();
    const res = await this.api.RepositoryFiles.show(`${this.parameters.username}/${this.parameters.project}`, path, this.parameters.branch);

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

  async test() {
    console.log("yes yes")

    this.api.Users.showCurrentUser()
      .then(
        ({ username, email, name, avatarUrl, bio, websiteUrl, organisation }) => {
          console.log(username)
        }
      )
      .catch((err) => {
        throw new err;
      });

    console.log("inter")

    // let projects = await this.api.Projects.all({ maxPages: 2 });
    this.api.Projects.all().then((projects) => {
      console.log(projects);
    });

    console.log("no no")

    this.api.Branches.show("RomainGiraud/lafav", "main").then(
      (res) => res.commit.id,
    );

    this.api.RepositoryFiles.show("RomainGiraud/lafav", "staticman.yml", "main")
      .then((v) => {
        console.log(v)
      })
      .catch((err) => {
        console.error(JSON.stringify(err.cause))
      },
    );
  }
}
