import { describe, expect, it } from "vitest";
import { decodeText, looksBinary, sniffSignature } from "@/lib/data/decode";

const utf8 = (s: string) => new TextEncoder().encode(s);
const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
function utf16le(s: string, bom: boolean) {
  const bytes: number[] = bom ? [0xff, 0xfe] : [];
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    bytes.push(c & 0xff, c >> 8);
  }
  return new Uint8Array(bytes);
}

describe("decodeText", () => {
  it("reads UTF-8", () => {
    expect(decodeText(utf8("station,°C\nKöln,3"))).toEqual({ text: "station,°C\nKöln,3", encoding: "utf-8" });
  });
  it("strips a UTF-8 BOM (Excel 'CSV UTF-8')", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("a,b")]);
    expect(decodeText(bytes)).toEqual({ text: "a,b", encoding: "utf-8" });
  });
  it("falls back to Windows-1252 for Latin-1 files", () => {
    const r = decodeText(latin1("Messstelle;Temperatur_°C\nMünchen;3,5"));
    expect(r.encoding).toBe("windows-1252");
    expect(r.text).toBe("Messstelle;Temperatur_°C\nMünchen;3,5");
  });
  it("reads UTF-16 with and without BOM", () => {
    expect(decodeText(utf16le("a\tb\n1\t2", true))).toEqual({ text: "a\tb\n1\t2", encoding: "utf-16le" });
    expect(decodeText(utf16le("a\tb\n1\t2", false))).toEqual({ text: "a\tb\n1\t2", encoding: "utf-16le" });
  });
});

describe("file sniffing", () => {
  it("recognises signatures", () => {
    expect(sniffSignature(new Uint8Array([0x50, 0x4b, 3, 4]))).toBe("zip");
    expect(sniffSignature(utf8("%PDF-1.7"))).toBe("pdf");
    expect(sniffSignature(utf8("a,b"))).toBeNull();
  });
  it("detects binary content", () => {
    expect(looksBinary(new Uint8Array(200).map((_, i) => i % 7))).toBe(true);
    expect(looksBinary(utf8("a,b\n1,2\n"))).toBe(false);
  });
});
