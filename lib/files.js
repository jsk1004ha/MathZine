import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/store";

export function sanitizeUploadName(fileName, fallbackExtension = ".pdf") {
  const safeName = String(fileName ?? `upload${fallbackExtension}`)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

  return safeName.toLowerCase().endsWith(fallbackExtension) ? safeName : `${safeName}${fallbackExtension}`;
}

export async function savePdfUpload(file) {
  const upload = await saveUpload(file, {
    directory: "pdf",
    allowedExtensions: [".pdf"],
    fallbackExtension: ".pdf"
  });

  return {
    originalFileName: upload.originalFileName,
    storedFileName: upload.storedFileName,
    fileSize: upload.fileSize
  };
}

function getExtension(fileName, fallbackExtension) {
  const extension = path.extname(String(fileName ?? "")).toLowerCase();
  return extension || fallbackExtension;
}

export async function saveUpload(
  file,
  { directory = "misc", allowedExtensions = [], fallbackExtension = ".bin" } = {}
) {
  const extension = getExtension(file.name, fallbackExtension);

  if (allowedExtensions.length && !allowedExtensions.includes(extension)) {
    throw new Error("허용되지 않은 파일 형식입니다.");
  }

  const safeOriginalName = sanitizeUploadName(file.name, extension);
  const storedFileName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
  const targetDir = path.join(uploadsDir, directory);
  const storedPath = path.join(targetDir, storedFileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(targetDir, { recursive: true });
  await writeFile(storedPath, buffer);

  return {
    originalFileName: safeOriginalName,
    storedFileName: `${directory}/${storedFileName}`,
    fileSize: buffer.byteLength
  };
}

export async function readUploadedPdf(storedFileName) {
  const filePath = path.join(uploadsDir, sanitizeStoredFileName(storedFileName));
  return readFile(filePath);
}

export async function readUploadedFile(storedFileName) {
  const filePath = path.join(uploadsDir, sanitizeStoredFileName(storedFileName));
  return readFile(filePath);
}

export function sanitizeStoredFileName(fileName) {
  return String(fileName ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .join("/");
}
