import { expect, test, describe } from "bun:test";
import * as utils from "./Utils";
import Elysia from "elysia";

async function submitForm(form: FormData): Promise<Record<string, unknown>> {
  // Echo the body parsed by Elysia
  const app = new Elysia().post("/", ({ body }) => body);

  const response = await app.handle(
    new Request("http://localhost/", { method: "POST", body: form }),
  );

  // Expected: { "people[][]": ["John", "Jane"] }
  const formData = (await response.json()) as Record<string, unknown>;
  return formData;
}

describe("create current date", () => {
  test("timestamp", () => {
    expect(utils.createDate("timestamp")).toMatch(/^\d{13}$/);
  });

  test("timestamp-seconds", () => {
    expect(utils.createDate("timestamp-seconds")).toMatch(/^\d{10,}$/);
  });

  test("iso8601", () => {
    expect(utils.createDate("iso8601")).toMatch(
      /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/,
    );
  });
});

type TestTupleSubmitForm = [
  label: string,
  rawData: [string, string][],
  parsedData: Record<string, unknown>,
  finalData: Record<string, unknown>,
];
describe.each<TestTupleSubmitForm>([
  ["simple", [["name", "John"]], { name: "John" }, { name: "John" }],
  ["empty", [["", "John"]], {}, {}],
  ["zero", [["0", "John"]], { "0": "John" }, { 0: "John" }],
  [
    "deeper",
    [["myhash[mykey][mysubkey][mysubsubkey]", "myvalue"]],
    { "myhash[mykey][mysubkey][mysubsubkey]": "myvalue" },
    { myhash: { mykey: { mysubkey: { mysubsubkey: "myvalue" } } } },
  ],
  [
    "many",
    [
      ["myhash[mykey1]", "myvalue1"],
      ["myhash[mykey2]", "myvalue2"],
    ],
    { "myhash[mykey1]": "myvalue1", "myhash[mykey2]": "myvalue2" },
    { myhash: { mykey1: "myvalue1", mykey2: "myvalue2" } },
  ],
  [
    "same",
    [
      ["mykey", "myvalue1"],
      ["mykey", "myvalue2"],
    ],
    { mykey: ["myvalue1", "myvalue2"] },
    { mykey: ["myvalue1", "myvalue2"] },
  ],
  [
    "same deeper",
    [
      ["myhash[mykey1]", "myvalue1"],
      ["myhash[mykey1]", "myvalue2"],
    ],
    { "myhash[mykey1]": ["myvalue1", "myvalue2"] },
    { myhash: { mykey1: ["myvalue1", "myvalue2"] } },
  ],
  [
    "array",
    [
      ["myarray[]", "myvalue1"],
      ["myarray[]", "myvalue2"],
    ],
    { "myarray[]": ["myvalue1", "myvalue2"] },
    { myarray: [["myvalue1", "myvalue2"]] },
  ],
  [
    "array of objects",
    [
      ["people[0][name]", "John"],
      ["people[0][age]", "30"],
      ["people[1][name]", "Jane"],
      ["people[1][age]", "40"],
    ],
    {
      "people[0][name]": "John",
      "people[0][age]": "30",
      "people[1][name]": "Jane",
      "people[1][age]": "40",
    },
    {
      people: [
        { name: "John", age: "30" },
        { name: "Jane", age: "40" },
      ],
    },
  ],
])("Converting form data to JSON", (label, rawData, parsedData, finalData) => {
  test(label, async () => {
    const form = new FormData();
    for (const [k, v] of rawData) {
      form.append(k, v);
    }
    const parsedForm = await submitForm(form);
    expect(parsedForm).toEqual(parsedData);

    expect(utils.expandSubmittedData(parsedForm)).toEqual(finalData);
  });
});

type TestTupleParseFM = [
  label: string,
  content: string,
  result: Record<string, string | number>,
];
describe.each<TestTupleParseFM>([
  [
    "params and message",
    "---\nname: John\nage: 20\n---\nHello world\n",
    { name: "John", age: 20, message: "Hello world" },
  ],
  [
    "message is trimmed",
    "---\nname: John\n---\n\n  Hello  \n\n",
    { name: "John", message: "Hello" },
  ],
  [
    "multiline message",
    "---\nname: John\n---\nLine 1\nLine 2\n",
    { name: "John", message: "Line 1\nLine 2" },
  ],
  [
    "message overrides a message param",
    "---\nmessage: param\n---\nbody\n",
    { message: "body" },
  ],
  [
    "empty message",
    "---\nname: John\n---\n",
    {
      name: "John",
      message: "",
    },
  ],
])("parse frontmatter", (label, content, result) => {
  test(label, () => {
    expect(utils.parseFrontmatter(content)).toEqual(result);
  });
});

describe.each([
  ["missing delimiters", "just text", "Invalid frontmatter format"],
  [
    "missing closing delimiter",
    "---\nname: John\n",
    "Invalid frontmatter format",
  ],
  [
    "params are not an object",
    "---\njust a string\n---\nbody\n",
    "Invalid frontmatter format",
  ],
  ["empty params", "---\n---\nbody\n", "Invalid frontmatter format"],
  [
    "non string/number value",
    "---\ntags:\n  - a\n---\nbody\n",
    "tags is not a string or number",
  ],
])("invalid frontmatter", (label, content, error) => {
  test(label, () => {
    expect(() => utils.parseFrontmatter(content)).toThrow(error);
  });
});
