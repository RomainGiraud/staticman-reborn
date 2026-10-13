import { defineNetwork, InterceptorSource } from "msw/experimental";
import { FetchInterceptor } from "@mswjs/interceptors/fetch/web";
import type { AnyHandler } from "msw";

export function setupServer(...handlers: Array<AnyHandler>) {
  return defineNetwork({
    sources: [
      new InterceptorSource({
        interceptors: [
          // The "fetch/web" entry works on Bun but its declared type is not
          // assignable to the one InterceptorSource expects (nominal #private brand).
          new FetchInterceptor() as never,
        ],
      }),
    ],
    handlers,
    onUnhandledFrame: "error",
    context: { quiet: true },
  });
}
