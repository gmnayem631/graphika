/**
 * Turn the raw bytes of a text file into a string, detecting the encoding.
 *
 * Order: byte-order mark → UTF-16 without BOM (lots of NUL bytes) →
 * strict UTF-8 → Windows-1252 (the usual Excel "CSV" encoding on Windows,
 * a superset of Latin-1).
 */
export interface DecodedText {
  text: string;
  encoding: "utf-8" | "utf-16le" | "utf-16be" | "windows-1252";
}

export function decodeText(bytes: Uint8Array): DecodedText {
  // Byte-order marks.
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), encoding: "utf-8" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), encoding: "utf-16le" };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), encoding: "utf-16be" };
  }

  // UTF-16 without a BOM: ASCII text has a NUL in every other byte.
  const sample = bytes.subarray(0, 4096);
  let nulEven = 0;
  let nulOdd = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) {
      if (i % 2 === 0) nulEven++;
      else nulOdd++;
    }
  }
  const half = sample.length / 2;
  if (half > 0 && nulOdd / half > 0.3 && nulEven / half < 0.05) {
    return { text: new TextDecoder("utf-16le").decode(bytes), encoding: "utf-16le" };
  }
  if (half > 0 && nulEven / half > 0.3 && nulOdd / half < 0.05) {
    return { text: new TextDecoder("utf-16be").decode(bytes), encoding: "utf-16be" };
  }

  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
  }
}

/** True if the bytes look like a binary (non-text) file. */
export function looksBinary(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 4096);
  if (sample.length === 0) return false;
  let control = 0;
  for (const b of sample) {
    // NUL and other C0 control characters except tab, LF, CR, FF.
    if (b < 0x09 || (b > 0x0d && b < 0x20 && b !== 0x1b)) control++;
  }
  return control / sample.length > 0.1;
}

/** Recognise common file signatures so we can give a precise message. */
export type Signature = "zip" | "ole" | "pdf" | "png" | "jpeg" | "gif" | "gzip" | null;

export function sniffSignature(bytes: Uint8Array): Signature {
  const b = bytes;
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "zip"; // xlsx, ods, docx, zip
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "ole"; // legacy .xls, .doc
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf"; // %PDF
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif";
  if (b[0] === 0x1f && b[1] === 0x8b) return "gzip";
  return null;
}
