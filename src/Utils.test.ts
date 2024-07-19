import { expect, test, describe } from "bun:test";
import * as utils from "./Utils";

describe("convert FormData to JSON", () => {
  test("simple key", () => {
    const formData = new FormData();
    formData.append("mykey", "myvalue");
    expect(utils.formDataToJson(formData)).toEqual({
      mykey: "myvalue",
    });
  });

  test("object with a key", () => {
    const formData = new FormData();
    formData.append("myhash[mykey][mysubkey][mysubsubkey]", "myvalue");
    expect(utils.formDataToJson(formData)).toEqual({
      myhash: {
        mykey: {
          mysubkey: {
            mysubsubkey: "myvalue",
          },
        },
      },
    });
  });

  test("object with several keys", () => {
    const formData = new FormData();
    formData.append("myhash[mykey1]", "myvalue1");
    formData.append("myhash[mykey2]", "myvalue2");
    expect(utils.formDataToJson(formData)).toEqual({
      myhash: {
        mykey1: "myvalue1",
        mykey2: "myvalue2",
      },
    });
  });

  test("array", () => {
    const formData = new FormData();
    formData.append("arr[]", "val1");
    formData.append("arr[]", "val2");
    formData.append("arr[]", "val3");
    expect(utils.formDataToJson(formData)).toEqual({
      arr: ["val1", "val2", "val3"],
    });
  });

  test("array of object", () => {
    const formData = new FormData();
    formData.append("arr[].name", "John");
    formData.append("arr[].age", "20");
    formData.append("arr[].name", "Jane");
    formData.append("arr[].age", "40");
    expect(utils.formDataToJson(formData)).toEqual({
      arr: [
        { name: "John", age: "20" },
        { name: "Jane", age: "40" },
      ],
    });
  });

  test("array of partial object", () => {
    const formData = new FormData();
    formData.append("arr[].name", "John");
    formData.append("arr[].name", "Jane");
    formData.append("arr[].age", "40");
    expect(utils.formDataToJson(formData)).toEqual({
      arr: [{ name: "John" }, { name: "Jane", age: "40" }],
    });
  });

  test("double array ", () => {
    const formData = new FormData();
    formData.append("arr[][]", "John");
    formData.append("arr[][]", "Doe");
    expect(utils.formDataToJson(formData)).toEqual({
      arr: [["John"], ["Doe"]],
    });
  });
});
