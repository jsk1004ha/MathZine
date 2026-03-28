export function parseApiError(payload, fallback = "요청을 처리하지 못했습니다.") {
  if (!payload) {
    return fallback;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (payload.error?.message) {
    return payload.error.message;
  }

  return payload.message || fallback;
}
