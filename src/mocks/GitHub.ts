import { http, HttpResponse, type PathParams } from "msw";
import YAML from "yaml";
import { type Parameters } from "../SiteConfig";
import {
  submittedForm,
  createConfigRegistry,
  createDefaultConfig,
  isExpectedComment,
} from "./common";

export { submittedForm, createDefaultConfig };

export const requestParameters: Parameters = {
  service: "mygithub",
  username: "user",
  project: "test",
  branch: "main",
  property: "comments",
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

const { configFiles, registerConfigFile, unregisterConfigFile } =
  createConfigRegistry();

export { registerConfigFile, unregisterConfigFile };

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

      const element = url.pathname.split("/contents/")[1];
      if (element === undefined) {
        return new HttpResponse("Not found", { status: 404 });
      }
      const filePath = decodeURIComponent(element);
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

      const element = url.pathname.split("/contents/")[1];
      if (element === undefined) {
        return new HttpResponse("Not found", { status: 404 });
      }
      const filePath = decodeURIComponent(element);
      const p = await request.json();

      if (
        !repoMatches(owner, repo) ||
        !isExpectedComment(filePath, p.content, p?.message)
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
