import "server-only";
import { db } from "./db";

const MAX_BYTES = 5 * 1024 * 1024;

// Check real file signatures, not just the browser-supplied MIME type.
const SIGNATURES: { ext: string; mime: string; bytes: number[] }[] = [
  { ext: "pdf", mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: "png", mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
];

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Stores a private upload in the database (never in /public, and works on
 * serverless hosts without a disk). Returns a reference like "db:<id>".
 * Malware scanning: plug a scanner into `scan()` before launch.
 */
export async function savePrivateUpload(file: File, folder: string): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File must be 5 MB or smaller." };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = SIGNATURES.find((s) => s.bytes.every((b, i) => buf[i] === b));
  if (!kind) return { ok: false, error: "Only PDF, PNG or JPG files are accepted." };
  if (!(await scan(buf))) return { ok: false, error: "The file failed a security check." };
  const stored = await db.storedFile.create({ data: { folder, mime: kind.mime, size: buf.length, data: buf } });
  return { ok: true, path: `db:${stored.id}` };
}

/** Loads a private file by its stored reference. Callers must check permissions first. */
export async function readPrivateFile(ref: string): Promise<{ data: Uint8Array<ArrayBuffer>; mime: string } | null> {
  if (!ref.startsWith("db:")) return null;
  const f = await db.storedFile.findUnique({ where: { id: ref.slice(3) } });
  return f ? { data: new Uint8Array(f.data), mime: f.mime } : null;
}

async function scan(buf: Buffer) {
  void buf;
  // TODO(launch): integrate an antivirus scanner. Returning true = not scanned.
  return true;
}
