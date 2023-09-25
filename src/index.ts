import { Elysia } from "elysia";
import Staticman from "./Staticman";
import { BodyRequest } from "./Utils";

const app = new Elysia()
  .onError(({ error }) => {
    return { error: error.toString() };
  })
  .post(
    "/entry/:service/:username/:project/:branch/:property",
    async ({ params, body, set }) => {
      const sm = new Staticman();
      await sm.process(params, body as BodyRequest);

      const br = body as BodyRequest;
      if ("redirect" in br["options"]) {
        console.log(`redirect to ${br["options"]["redirect"]}`)
        set.redirect = br["options"]["redirect"];
      }
    },
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
