import { expect, test, beforeAll, afterEach, afterAll } from "bun:test";
import { GitLab } from "./GitLab";
import { BodyRequest, Parameters } from "./Utils";
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import Staticman from "./Staticman";
import YAML from "yaml";
import fs from 'fs'

const handlers = [
  http.get('https://gitlab.com/api/v4/projects/:id/repository/files/:file_path', async ({request, params}) => {
    const { id, file_path } = params;
    const p = new URL(request.url).searchParams;

    let content = fs.readFileSync('staticman.yaml', 'utf8');
    content = Buffer.from(content).toString("base64");

    return HttpResponse.json({
      file_name: file_path,
      file_path: file_path,
      size: content.length,
      encoding: "base64",
      content,
    });
  }),
  
  http.get('https://gitlab.com/api/v4/projects/:id/repository/branches/:branch', async ({request, params}) => {
    // return HttpResponse.json({
    //   name: "main",
    //   commit: {
    //     id: "7b5c3cc8be40ee161ae89a06bba6229da1032a0c",
    //     short_id: "7b5c3cc",
    //   }
    // });
    return HttpResponse.json({
      name: "main",
      merged: false,
      protected: true,
      default: true,
      developers_can_push: false,
      developers_can_merge: false,
      can_push: true,
      web_url: "https://gitlab.example.com/my-group/my-project/-/tree/main",
      commit: {
        id: "7b5c3cc8be40ee161ae89a06bba6229da1032a0c",
        short_id: "7b5c3cc",
        created_at: "2012-06-28T03:44:20-07:00",
        parent_ids: [
          "4ad91d3c1144c406e50c7b33bae684bd6837faf8"
        ],
        title: "add projects API",
        message: "add projects API",
        author_name: "John Smith",
        author_email: "john@example.com",
        authored_date: "2012-06-27T05:51:39-07:00",
        committer_name: "John Smith",
        committer_email: "john@example.com",
        committed_date: "2012-06-28T03:44:20-07:00",
        trailers: {},
        web_url: "https://gitlab.example.com/my-group/my-project/-/commit/7b5c3cc8be40ee161ae89a06bba6229da1032a0c"
      }
    });
  }),
  
  http.post('https://gitlab.com/api/v4/projects/:id/repository/branches', async ({request, params}) => {
    return HttpResponse.json({
      "commit": {
        "id": "7b5c3cc8be40ee161ae89a06bba6229da1032a0c",
        "short_id": "7b5c3cc",
        "created_at": "2012-06-28T03:44:20-07:00",
        "parent_ids": [
          "4ad91d3c1144c406e50c7b33bae684bd6837faf8"
        ],
        "title": "add projects API",
        "message": "add projects API",
        "author_name": "John Smith",
        "author_email": "john@example.com",
        "authored_date": "2012-06-27T05:51:39-07:00",
        "committer_name": "John Smith",
        "committer_email": "john@example.com",
        "committed_date": "2012-06-28T03:44:20-07:00",
        "trailers": {},
        "web_url": "https://gitlab.example.com/my-group/my-project/-/commit/7b5c3cc8be40ee161ae89a06bba6229da1032a0c"
      },
      "name": "newbranch",
      "merged": false,
      "protected": false,
      "default": false,
      "developers_can_push": false,
      "developers_can_merge": false,
      "can_push": true,
      "web_url": "https://gitlab.example.com/my-group/my-project/-/tree/newbranch"
    });
  }),
  
  http.post('https://gitlab.com/api/v4/projects/:id/repository/files/:file_path', async ({request, params}) => {
    return HttpResponse.json({
      "file_path": "app/project.rb",
      "branch": "main"
    });
  }),
  
  http.post('https://gitlab.com/api/v4/projects/:id/merge_requests', async ({request, params}) => {
    return HttpResponse.json({
      "id": 1,
      "iid": 1,
      "project_id": 3,
      "title": "test1",
      "description": "fixed login page css paddings",
      "state": "merged",
      "imported": false,
      "imported_from": "none",
      "created_at": "2017-04-29T08:46:00Z",
      "updated_at": "2017-04-29T08:46:00Z",
      "target_branch": "main",
      "source_branch": "test1",
      "upvotes": 0,
      "downvotes": 0,
      "author": {
        "id": 1,
        "name": "Administrator",
        "username": "admin",
        "state": "active",
        "avatar_url": null,
        "web_url" : "https://gitlab.example.com/admin"
      },
      "assignee": {
        "id": 1,
        "name": "Administrator",
        "username": "admin",
        "state": "active",
        "avatar_url": null,
        "web_url" : "https://gitlab.example.com/admin"
      },
      "source_project_id": 2,
      "target_project_id": 3,
      "labels": [
        "Community contribution",
        "Manage"
      ],
      "draft": false,
      "work_in_progress": false,
      "milestone": {
        "id": 5,
        "iid": 1,
        "project_id": 3,
        "title": "v2.0",
        "description": "Assumenda aut placeat expedita exercitationem labore sunt enim earum.",
        "state": "closed",
        "created_at": "2015-02-02T19:49:26.013Z",
        "updated_at": "2015-02-02T19:49:26.013Z",
        "due_date": "2018-09-22",
        "start_date": "2018-08-08",
        "web_url": "https://gitlab.example.com/my-group/my-project/milestones/1"
      },
      "merge_when_pipeline_succeeds": true,
      "merge_status": "can_be_merged",
      "detailed_merge_status": "not_open",
      "merge_error": null,
      "sha": "8888888888888888888888888888888888888888",
      "merge_commit_sha": null,
      "squash_commit_sha": null,
      "user_notes_count": 1,
      "discussion_locked": null,
      "should_remove_source_branch": true,
      "force_remove_source_branch": false,
      "allow_collaboration": false,
      "allow_maintainer_to_push": false,
      "web_url": "http://gitlab.example.com/my-group/my-project/merge_requests/1",
      "references": {
        "short": "!1",
        "relative": "!1",
        "full": "my-group/my-project!1"
      },
      "time_stats": {
        "time_estimate": 0,
        "total_time_spent": 0,
        "human_time_estimate": null,
        "human_total_time_spent": null
      },
      "squash": false,
      "subscribed": false,
      "changes_count": "1",
      "merged_by": { // Deprecated and will be removed in API v5, use `merge_user` instead
        "id": 87854,
        "name": "Douwe Maan",
        "username": "DouweM",
        "state": "active",
        "avatar_url": "https://gitlab.example.com/uploads/-/system/user/avatar/87854/avatar.png",
        "web_url": "https://gitlab.com/DouweM"
      },
      "merge_user": {
        "id": 87854,
        "name": "Douwe Maan",
        "username": "DouweM",
        "state": "active",
        "avatar_url": "https://gitlab.example.com/uploads/-/system/user/avatar/87854/avatar.png",
        "web_url": "https://gitlab.com/DouweM"
      },
      "merged_at": "2018-09-07T11:16:17.520Z",
      "prepared_at": "2018-09-04T11:16:17.520Z",
      "closed_by": null,
      "closed_at": null,
      "latest_build_started_at": "2018-09-07T07:27:38.472Z",
      "latest_build_finished_at": "2018-09-07T08:07:06.012Z",
      "first_deployed_to_production_at": null,
      "pipeline": {
        "id": 29626725,
        "sha": "2be7ddb704c7b6b83732fdd5b9f09d5a397b5f8f",
        "ref": "patch-28",
        "status": "success",
        "web_url": "https://gitlab.example.com/my-group/my-project/pipelines/29626725"
      },
      "diff_refs": {
        "base_sha": "c380d3acebd181f13629a25d2e2acca46ffe1e00",
        "head_sha": "2be7ddb704c7b6b83732fdd5b9f09d5a397b5f8f",
        "start_sha": "c380d3acebd181f13629a25d2e2acca46ffe1e00"
      },
      "diverged_commits_count": 2,
      "task_completion_status":{
        "count":0,
        "completed_count":0
      }
    });
  }),
];

const server = setupServer(...handlers);

// Establish API mocking before all tests.
beforeAll(() => server.listen({
  onUnhandledRequest: 'warn',
}));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

test("Read a file", async () => {
  const params: Parameters = {
    service: "gitlab",
    username: "user",
    project: "test",
    branch: "main",
    property: "comments",
  };
  const br: BodyRequest = {
    fields: {
      name: "Romain",
      email: "romain@example.org",
      message: "Coucou tout va bien",
    },
    options: {
      redirect: "http://google.com",
      parent: "",
      slug: "ici-et-la",
    },
  };

  const sm = new Staticman();
  expect(sm.process(params, br)).resolves.toBeUndefined();
});
