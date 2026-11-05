import { Elysia, status } from "elysia";
import Staticman from "./Staticman";
import { expandSubmittedData } from "./Utils";
import { BodyRequest, ParametersRequest } from "./SiteConfig";
import { logger } from "./Logger";
import { Config } from "./Config";
import { VERSION } from "./Version";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const app = new Elysia()
  .onError(({ error, request }) => {
    logger.debug(`Invalid request "${request.url}": ${error.toString()}`);
    return { error };
  })
  .onTransform(({ body }) => {
    if (!isRecord(body)) {
      return;
    }

    const newBody = expandSubmittedData(body);
    for (const key in body) {
      delete body[key];
    }
    for (const key in newBody) {
      body[key] = newBody[key];
    }
    if (!body["fields"]) body["fields"] = {};
    if (!body["options"]) body["options"] = {};
    return;
  })
  .get("/health", () => {
    return { status: "ok", version: VERSION };
  })
  .post(
    "/entry/v1/:service/:username/:project/:branch/:property",
    async ({ params, body, redirect, request }) => {
      logger.debug(`request: ${request.url}`);
      logger.debug(`params: ${JSON.stringify(params)}`);
      logger.debug(`body: ${JSON.stringify(body)}`);

      try {
        const sm = new Staticman();
        await sm.process(params, body);

        const options = body["options"];
        if ("redirect" in options) {
          return redirect(String(options["redirect"]));
        }
      } catch (error) {
        logger.error(`Error processing request: ${error}`);
        throw status(500, "Internal server error");
      }
    },
    {
      body: BodyRequest,
      params: ParametersRequest,
    },
  );

/* v8 ignore start */
if (import.meta.main) {
  app.listen(Config.get("port"));
  logger.info(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  );
}
/* v8 ignore end */
