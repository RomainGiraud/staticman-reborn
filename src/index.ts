import { Elysia } from "elysia";
import Staticman from "./Staticman";
import { formDataToJson } from "./Utils";
import { BodyRequest, ParametersRequest } from "./SiteConfig";

const app = new Elysia()
  .onError(({ error }) => {
    return { error: error.toString() };
  })
  .onParse(async ({ request, contentType }) => {
    if (contentType === "multipart/form-data") {
      return formDataToJson(await request.formData());
    }
  })
  .post(
    "/entry/v1/:service/:username/:project/:branch/:property",
    async ({ params, body, set }) => {
      const sm = new Staticman();
      await sm.process(params, body);

      const options = body["options"];
      if ("redirect" in options) {
        set.redirect = String(options["redirect"]);
      }
    },
    {
      body: BodyRequest,
      params: ParametersRequest,
    },
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
