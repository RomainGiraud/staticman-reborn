import { Elysia, form, t } from "elysia";
import Staticman from "./Staticman";
import { formDataToJson } from "./Utils";

const app = new Elysia()
  .onError(({ error }) => {
    return { error: error.toString() };
  })
  .onParse(async ({ request, contentType }) => {
    if (contentType === 'multipart/form-data') {
      return formDataToJson(await request.formData());
    }
  })
  .post(
    "/entry/:service/:username/:project/:branch/:property",
    async ({ params, body, set }) => {
      const sm = new Staticman();
      await sm.process(params, body);

      const options = body["options"];
      if ("redirect" in options) {
        set.redirect = String(options["redirect"]);
      }
    }, {
    params: t.Object({
      service: t.String(),
      username: t.String(),
      project: t.String(),
      branch: t.String(),
      property: t.String(),
    }),
    body: t.Object({
      fields: t.Record(t.String(), t.Any()),
      options: t.Record(t.String(), t.Any()),
    }),
  }
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
