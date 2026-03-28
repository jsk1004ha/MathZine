import path from "node:path";
import { NextResponse } from "next/server";
import { readUploadedFile, sanitizeStoredFileName } from "@/lib/files";

const contentTypes = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".ogg": "video/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp"
};

export async function GET(_request, { params }) {
  try {
    const { filePath } = await params;
    const storedFileName = sanitizeStoredFileName(Array.isArray(filePath) ? filePath.join("/") : String(filePath ?? ""));

    if (!storedFileName) {
      return new NextResponse("Not found", { status: 404 });
    }

    const buffer = await readUploadedFile(storedFileName);
    const extension = path.extname(storedFileName).toLowerCase();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
