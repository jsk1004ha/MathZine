import { NextResponse } from "next/server";
import { logStructuredEvent } from "@/lib/ops";
export { parseApiError } from "@/lib/api-client";

export function jsonSuccess(data = {}, options = {}) {
  const { status = 200, meta, headers = {} } = options;
  const response = NextResponse.json(
    {
      ok: true,
      data,
      ...(meta ? { meta } : {})
    },
    { status }
  );

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export function jsonError(error, fallback = {}) {
  const status = error?.status || fallback.status || 400;
  const code = error?.code || fallback.code || "BAD_REQUEST";
  const message = error?.message || fallback.message || "요청을 처리하지 못했습니다.";

  logStructuredEvent(status >= 500 ? "error" : "warn", "api.error", {
    status,
    code,
    message
  });

  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(error?.details ? { details: error.details } : {})
      }
    },
    { status }
  );
}

export function parsePagination(searchParams, defaults = {}) {
  const page = Math.max(1, Number(searchParams?.get("page") ?? defaults.page ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams?.get("pageSize") ?? defaults.pageSize ?? 10) || 10));
  return { page, pageSize };
}

export function paginateItems(items, { page, pageSize }) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    items: items.slice(offset, offset + pageSize),
    meta: {
      page: safePage,
      pageSize,
      total,
      totalPages
    }
  };
}

export function noStoreHeaders() {
  return {
    "Cache-Control": "no-store"
  };
}
