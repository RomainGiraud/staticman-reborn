import { expect, test } from "bun:test";
import * as transformers from "./Transformers";

test("upcase", () => {
  expect(transformers.upcase('ok')).toBe('OK');
  expect(transformers.upcase('OK')).toBe('OK');
  expect(transformers.upcase('ok 123 OK àéè @')).toBe('OK 123 OK ÀÉÈ @');
});

test("downcase", () => {
  expect(transformers.downcase('ok')).toBe('ok');
  expect(transformers.downcase('OK')).toBe('ok');
  expect(transformers.downcase('OK 123 ok ÀÉÈ @')).toBe('ok 123 ok àéè @');
});

test("crypt", () => {
  expect(transformers.decrypt(transformers.encrypt('ok'))).toBe('ok');
  expect(transformers.decrypt(transformers.encrypt('aaaaaaaaaa4444444444444444'))).toBe('aaaaaaaaaa4444444444444444');
});

test("rmCR", () => {
  expect(transformers.rmCR(`Test 1\r\nTest 2\r\nTest 3\r\nTest 4`)).toBe(`Test 1\nTest 2\nTest 3\nTest 4`);
});

test("escapeHTML", () => {
  expect(transformers.escapeHTML('<p>&gt; Test</p>')).toBe('&lt;p&gt;&amp;gt; Test&lt;/p&gt;');
});

test("slugify", () => {
  expect(transformers.slugify('Ici ou là ?')).toBe('ici-ou-la');
});
