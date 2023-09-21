import { Elysia } from "elysia";
import { GitLab } from "./GitLab";

const gitlabToken = "XXXXXXXXXXXXXX";
const remoteConfigFile = "staticman.yml";

const app = new Elysia()
  .get("/entry/:service/:username/:project/:branch/:property", async ({ params: { service, username, project, branch, property }}) => {
    const gl = new GitLab(gitlabToken, {
      service,
      username,
      project,
      branch,
      property,
    });
    let l = await gl.readFile(remoteConfigFile);
    console.log(l);
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
