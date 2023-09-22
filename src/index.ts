import { Elysia } from "elysia";
import Staticman from "./Staticman";
import { Body } from "./Utils";

const app = new Elysia()
  .onError(({ error }) => {
    return { error: error.toString() }
  })
  .post("/entry/:service/:username/:project/:branch/:property", async ({ params, body }) => {
    const sm = new Staticman();
    await sm.process(params, body as Body);
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
