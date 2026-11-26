import "server-only";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;

// Check real file signatures, not just the browser-supplied MIME type.
const SIGNATURES: { ext: string; bytes: number[] }[] = [
  { ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
];

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Stores a private upload OUTSIDE /public so it can never be fetched directly.
 * Malware scanning: plug a scanner (e.g. ClamAV) into `scan()` before launch.
 */
export async function savePrivateUpload(file: File, folder: string): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File must be 5 MB or smaller." };
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = SIGNATURES.find((s) => s.bytes.every((b, i) => buf[i] === b));
  if (!kind) return { ok: false, error: "Only PDF, PNG or JPG files are accepted." };
  if (!(await scan(buf))) return { ok: false, error: "The file failed a security check." };
  const dir = path.join(process.cwd(), "storage", "private", folder);
  await mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${kind.ext}`;
  await writeFile(path.join(dir, name), buf);
  // Path is relative to storage/ (the admin file routes resolve it there).
  return { ok: true, path: `private/${folder}/${name}` };
}

async function scan(buf: Buffer) {
  void buf;
  // TODO(launch): integrate an antivirus scanner. Returning true = not scanned.
  return true;
}
