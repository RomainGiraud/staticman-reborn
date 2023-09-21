import { Elysia } from "elysia";
import { GitLab } from "./GitLab";

const gitlabToken = "XXXXXXXXXXXXXX";
const remoteConfigFile = "staticman.yml";

const app = new Elysia()
  .onError(({ error }) => {
    return { error: error.toString() }
  })
  .post("/entry/:service/:username/:project/:branch/:property", async ({ params: { service, username, project, branch, property }, body}) => {
    const gl = new GitLab(gitlabToken, {
      service,
      username,
      project,
      branch,
      property,
    });
    let remoteConfig = await gl.readFile(remoteConfigFile);

    const prop = property.toString();
    if (!(prop in remoteConfig)) {
      throw new Error('Server is during maintainance');
    }
    let item = remoteConfig[prop];
    console.log(item);
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
