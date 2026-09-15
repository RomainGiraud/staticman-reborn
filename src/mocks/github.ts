import { http, HttpResponse, PathParams } from "msw";
import { type Static } from "elysia";
import YAML from "yaml";
import { Parameters } from "../Utils";
import { SiteConfigSchema } from "../SiteConfig";
import * as transfomers from "../Transformers";

export const requestParameters: Parameters = {
  service: "github",
  username: "user",
  project: "test",
  branch: "main",
  property: "comments",
};

export const bodyRequest = {
  fields: {
    name: "Romain",
    email: "romain@example.org",
    message: "Hello, everything works fine!",
  },
  options: {
    redirect: "http://google.com",
    parent: "123",
    slug: "my-post",
  },
};

interface CreateRefBody {
  ref: string;
  sha: string;
}

interface CreateFileBody {
  branch: string;
  content: string;
  message: string;
}

interface CreatePullBody {
  title: string;
  head: string;
  base: string;
  body: string;
}

const configFiles: Record<string, Static<typeof SiteConfigSchema>> = {};

export function registerConfigFile(
  name: string,
  conf: Static<typeof SiteConfigSchema>,
) {
  if (name in configFiles) {
    throw new Error(`Config file ${name} already exists`);
  }
  configFiles[name] = conf;
}

export function unregisterConfigFile(name: string) {
  if (!(name in configFiles)) {
    throw new Error(`Config file ${name} does not exist`);
  }
  delete configFiles[name];
}

function repoMatches(owner: string, repo: string): boolean {
  return (
    owner === requestParameters.username && repo === requestParameters.project
  );
}

export const handlers = [
  http.get(
    "https://api.github.com/repos/:owner/:repo/contents/*",
    async ({ request, params }) => {
      const { owner, repo } = params as { owner: string; repo: string };
      const url = new URL(request.url);
      const filePath = decodeURIComponent(url.pathname.split("/contents/")[1]);
      const ref = url.searchParams.get("ref");

      if (
        !repoMatches(owner, repo) ||
        ref != requestParameters.branch ||
        !(filePath in configFiles)
      ) {
        return new HttpResponse("Not found", { status: 404 });
      }

      const config = configFiles[filePath];
      const content = Buffer.from(YAML.stringify(config)).toString("base64");

      return HttpResponse.json({
        name: filePath.split("/").pop(),
        path: filePath,
        type: "file",
        size: content.length,
        encoding: "base64",
        content,
      });
    },
  ),

  http.get(
    "https://api.github.com/repos/:owner/:repo/branches/:branch",
    async ({ params }) => {
      const { owner, repo, branch } = params as {
        owner: string;
        repo: string;
        branch: string;
      };

      if (!repoMatches(owner, repo) || branch != requestParameters.branch) {
        return new HttpResponse("Not found", { status: 404 });
      }

      return HttpResponse.json({
        name: branch,
        commit: {
          sha: "7b5c3cc8be40ee161ae89a06bba6229da1032a0c",
          commit: {
            url: `https://api.github.com/repos/${owner}/${repo}/git/commits/7b5c3cc8be40ee161ae89a06bba6229da1032a0c`,
          },
        },
        protected: true,
      });
    },
  ),

  http.post<PathParams, CreateRefBody>(
    "https://api.github.com/repos/:owner/:repo/git/refs",
    async ({ request, params }) => {
      const { owner, repo } = params as { owner: string; repo: string };
      const p = await request.json();

      if (
        !repoMatches(owner, repo) ||
        !/^refs\/heads\/staticman_[\w-]+$/.test(p?.ref)
      ) {
        return new HttpResponse("Not found", { status: 404 });
      }

      return HttpResponse.json({
        ref: p.ref,
        node_id: "abc123",
        url: `https://api.github.com/repos/${owner}/${repo}/git/refs/${p.ref}`,
        object: {
          sha: p.sha,
          type: "commit",
          url: `https://api.github.com/repos/${owner}/${repo}/git/commits/${p.sha}`,
        },
      });
    },
  ),

  http.put<PathParams, CreateFileBody>(
    "https://api.github.com/repos/:owner/:repo/contents/*",
    async ({ request, params }) => {
      const { owner, repo } = params as { owner: string; repo: string };
      const url = new URL(request.url);
      const filePath = decodeURIComponent(url.pathname.split("/contents/")[1]);
      const p = await request.json();

      const contentDecoded = Buffer.from(p.content, "base64").toString("utf8");
      const fileExtension = filePath.split(".").pop();

      let content: Record<string, string> = {};
      content["message"] = "";
      switch (fileExtension) {
        case "yaml":
          content = YAML.parse(contentDecoded);
          break;
        case "json":
          content = JSON.parse(contentDecoded);
          break;
        case "md": {
          const lines = contentDecoded.split("\n");

          if (!/^---$/.test(lines[0])) break;

          let index = 1;
          while (!/^---$/.test(lines[index])) {
            const line = lines[index].split(": ");
            content[line[0]] = line[1];
            index += 1;
          }
          index += 1;

          while (index < lines.length) {
            content["message"] += lines[index];
            index += 1;
          }
          content["message"] = content["message"].trim();

          break;
        }
      }

      const regex = new RegExp(
        String.raw`^comments\/my-post\/comment-\d+\.${fileExtension}$`,
      );
      if (
        !repoMatches(owner, repo) ||
        !regex.test(filePath) ||
        p?.message != "New comment in my-post" ||
        content?.name != bodyRequest.fields.name ||
        transfomers.decrypt(content?.email) != bodyRequest.fields.email ||
        content?.message != bodyRequest.fields.message ||
        content?.parent != bodyRequest.options.parent
      ) {
        return new HttpResponse("Not found", { status: 404 });
      }

      return HttpResponse.json({
        content: { path: filePath },
        commit: { sha: "8aa091d30e9451160653cbb341d2dab4847eed76" },
      });
    },
  ),

  http.post<PathParams, CreatePullBody>(
    "https://api.github.com/repos/:owner/:repo/pulls",
    async ({ request, params }) => {
      const { owner, repo } = params as { owner: string; repo: string };
      const p = await request.json();

      if (
        !repoMatches(owner, repo) ||
        !/^staticman_[\w-]+$/.test(p?.head) ||
        p?.base != requestParameters.branch
      ) {
        return new HttpResponse("Not found", { status: 404 });
      }

      return HttpResponse.json({
        id: 1,
        number: 1,
        state: "open",
        title: p.title,
        body: p.body,
        head: { ref: p.head },
        base: { ref: p.base },
        html_url: `https://github.com/${owner}/${repo}/pull/1`,
      });
    },
  ),
];

export function createDefaultConfig(): Static<typeof SiteConfigSchema> {
  return {
    comments: {
      allowedFields: ["name", "email", "message"],
      requiredFields: ["name", "email", "message"],
      branch: "main",
      path: "comments/{options.slug}",
      commitMessage: "New comment in {options.slug}",
      filename: "comment-{@timestamp}",
      format: "yaml",
      generatedFields: {
        date: {
          type: "date",
          format: "iso8601",
        },
      },
      moderation: true,
      name: "mysite.org",
      transforms: {
        name: ["rmCR", "escapeHTML"],
        email: "encrypt",
        message: ["rmCR", "escapeHTML"],
      },
    },
  };
}
