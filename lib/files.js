import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/store";

const FILE_SIGNATURES = {
  ".pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  ".png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  ".jpg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  ".jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  ".webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }
  ],
  ".gif": [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  ".mp4": [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  ".webm": [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  ".ogg": [{ offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }]
};

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

export async function saveSubmissionUpload(file) {
  const upload = await saveUpload(file, {
    directory: "submissions",
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".webp"],
    fallbackExtension: ".pdf"
  });

  return {
    originalFileName: upload.originalFileName,
    storedFileName: upload.storedFileName,
    fileSize: upload.fileSize,
    fileKind: getFileKind(upload.originalFileName),
    mimeType: getMimeType(upload.originalFileName)
  };
}

function getExtension(fileName, fallbackExtension) {
  const extension = path.extname(String(fileName ?? "")).toLowerCase();
  return extension || fallbackExtension;
}

export async function saveUpload(
  file,
  { directory = "misc", allowedExtensions = [], fallbackExtension = ".bin", maxBytes = 15 * 1024 * 1024 } = {}
) {
  const extension = getExtension(file.name, fallbackExtension);

  if (allowedExtensions.length && !allowedExtensions.includes(extension)) {
    throw new Error("허용되지 않은 파일 형식입니다.");
  }

  if (file.size > maxBytes) {
    throw new Error(`파일 크기는 ${Math.floor(maxBytes / (1024 * 1024))}MB 이하여야 합니다.`);
  }

  const safeOriginalName = sanitizeUploadName(file.name, extension);
  const storedFileName = `${Date.now()}-${randomUUID()}-${safeOriginalName}`;
  const targetDir = path.join(uploadsDir, directory);
  const storedPath = path.join(targetDir, storedFileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  assertFileSignature(buffer, extension);

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

export function getMimeType(fileName) {
  const extension = path.extname(String(fileName ?? "")).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".pdf":
    default:
      return "application/pdf";
  }
}

export function getFileKind(fileName) {
  return getMimeType(fileName).startsWith("image/") ? "image" : "pdf";
}

export function sanitizeStoredFileName(fileName) {
  return String(fileName ?? "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .join("/");
}

function assertFileSignature(buffer, extension) {
  const signatures = FILE_SIGNATURES[extension];

  if (!signatures || buffer.byteLength === 0) {
    return;
  }

  const matches = signatures.every((signature) =>
    signature.bytes.every((byte, index) => buffer[signature.offset + index] === byte)
  );

  if (!matches) {
    throw new Error("파일 시그니처가 올바르지 않습니다.");
  }
}
