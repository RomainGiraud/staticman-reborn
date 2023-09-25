import { Elysia } from "elysia";
import Staticman from "./Staticman";
import { Fields, BodyRequest } from "./Utils";

const app = new Elysia()
  .onError(({ error }) => {
    return { error: error.toString() };
  })
  .post(
    "/entry/:service/:username/:project/:branch/:property",
    async ({ params, body, set }) => {
      const br = body as BodyRequest;

      const sm = new Staticman();
      await sm.process(params, br);

      const options = br["options"] as Fields[];
      if ("redirect" in options) {
        console.log(`redirect to ${options.redirect}`);
        set.redirect = String(options["redirect"]);
      }
    },
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
