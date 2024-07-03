import NodeRSA from "node-rsa";
import { escape } from "html-escaper";
import slug from "slug";

import config from "./Config";

export function upcase(value: string): string {
  return String(value).toUpperCase();
}

export function downcase(value: string): string {
  return String(value).toLowerCase();
}

const key = new NodeRSA();
key.importKey(config.get("rsaPrivateKey"), "private");
export function encrypt(value: string): string {
  return key.encrypt(Buffer.from(value), "base64", "buffer");
}

export function decrypt(value: string): string {
  return key.decrypt(value, "utf8");
}

// remove carriage return
export function rmCR(value: string): string {
  return value.replace(/\r/g, "");
}

export function escapeHTML(value: string): string {
  return escape(value);
}

export function slugify(value: string): string {
  return slug(value);
}
