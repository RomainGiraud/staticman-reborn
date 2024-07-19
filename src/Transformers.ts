import { escape } from "html-escaper";
import slug from "slug";
import crypto from "crypto";
import { PrivateKey, PublicKey } from "./Config";

export function upcase(value: string): string {
  return String(value).toUpperCase();
}

export function downcase(value: string): string {
  return String(value).toLowerCase();
}

export function encrypt(value: string): string {
  const enc = crypto.publicEncrypt(PublicKey, Buffer.from(value));
  return enc.toString("base64");
}

export function decrypt(value: string): string {
  const dec = crypto.privateDecrypt(PrivateKey, Buffer.from(value, "base64"));
  return dec.toString();
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
