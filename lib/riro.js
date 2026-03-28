const RIRO_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
};

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractTextsByClass(html, className) {
  const regex = new RegExp(
    `<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    "gi"
  );

  return [...html.matchAll(regex)].map((match) => stripTags(match[1])).filter(Boolean);
}

function extractDisabledFields(html) {
  const values = [];
  const attrRegex =
    /<[^>]*class=["'][^"']*input_disabled[^"']*["'][^>]*value=["']([^"']*)["'][^>]*>/gi;
  const textRegex =
    /<[^>]*class=["'][^"']*input_disabled[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;

  for (const match of html.matchAll(attrRegex)) {
    values.push(stripTags(match[1]));
  }

  for (const match of html.matchAll(textRegex)) {
    values.push(stripTags(match[1]));
  }

  return [...new Set(values.filter(Boolean))];
}

function buildGeneration(sourceId) {
  if (!/^\d{2,}/.test(sourceId)) {
    return new Date().getFullYear() - 1994 + 1;
  }

  return Number(`20${sourceId.slice(0, 2)}`) - 1994 + 1;
}

function normalizeStudentNumber(rawValue) {
  const raw = stripTags(String(rawValue ?? ""));

  if (raw.length >= 3 && !/\d/.test(raw[1])) {
    return `${raw[0]}${raw.slice(2)}`.replace(/\D/g, "");
  }

  return raw.replace(/\D/g, "");
}

function parseIntegratedProfile(html, fallbackId, name, studentNumber) {
  const integratedText = extractTextsByClass(html, "elem_fix")[0] ?? "";
  const integratedId = integratedText.match(/\d{6,8}/)?.[0] ?? fallbackId;
  const student = integratedText
    .replace(integratedId, "")
    .replace(/[()]/g, "")
    .replace(/통합아이디/gi, "")
    .trim();

  if (!name || !studentNumber) {
    throw new Error("리로스쿨 통합 계정 정보를 해석하지 못했습니다.");
  }

  return {
    riroId: integratedId,
    name,
    student: student || "학생",
    studentNumber,
    generation: buildGeneration(integratedId)
  };
}

function parseProfileHtml(html, fallbackId) {
  const isIntegrated = extractTextsByClass(html, "td_title")[0] === "통합아이디";
  const fields = extractDisabledFields(html);
  const name = fields[0] ?? "";
  const studentNumber = normalizeStudentNumber(fields[1] ?? "");

  if (isIntegrated) {
    return parseIntegratedProfile(html, fallbackId, name, studentNumber);
  }

  const student =
    extractTextsByClass(html, "m_level3")[0] ??
    extractTextsByClass(html, "m_level1")[0] ??
    "학생";

  if (!name || !studentNumber) {
    throw new Error("리로스쿨 일반 계정 정보를 해석하지 못했습니다.");
  }

  return {
    riroId: fallbackId,
    name,
    student,
    studentNumber,
    generation: buildGeneration(fallbackId)
  };
}

export function getRiroMode() {
  return process.env.RIRO_MODE === "live" ? "live" : "mock";
}

export async function verifyRiroCredentials(riroId, password) {
  const normalizedId = String(riroId ?? "").trim();
  const normalizedPassword = String(password ?? "").trim();

  if (!normalizedId || !normalizedPassword) {
    throw new Error("리로스쿨 아이디와 비밀번호를 모두 입력해 주세요.");
  }

  if (getRiroMode() !== "live") {
    const derivedStudentNumber =
      normalizedId.replace(/\D/g, "").slice(-4).padStart(4, "1") || "1101";

    return {
      riroId: normalizedId,
      name: `데모 학생 ${normalizedId.slice(-2) || "01"}`,
      student: "리로스쿨 데모",
      studentNumber: derivedStudentNumber,
      generation: buildGeneration(normalizedId)
    };
  }

  const baseUrl = (process.env.RIRO_BASE_URL || "https://iscience.riroschool.kr").replace(
    /\/$/,
    ""
  );

  try {
    await fetch(`${baseUrl}/user.php?action=user_logout`, {
      method: "POST",
      headers: RIRO_HEADERS,
      body: new URLSearchParams()
    });
  } catch {}

  const loginResponse = await fetch(`${baseUrl}/ajax.php`, {
    method: "POST",
    headers: RIRO_HEADERS,
    body: new URLSearchParams({
      app: "user",
      mode: "login",
      userType: "1",
      id: normalizedId,
      pw: normalizedPassword,
      deeplink: "",
      redirect_link: ""
    }),
    cache: "no-store"
  });

  const loginJson = await loginResponse.json().catch(() => null);

  if (!loginJson) {
    throw new Error("인증 서버 응답을 해석하지 못했습니다.");
  }

  const code = String(loginJson.code ?? "");

  if (code === "902") {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  if (code !== "000" || !loginJson.token) {
    throw new Error(`리로스쿨 로그인에 실패했습니다. code=${code || "unknown"}`);
  }

  const profileResponse = await fetch(`${baseUrl}/user.php`, {
    method: "POST",
    headers: {
      ...RIRO_HEADERS,
      Cookie: `cookie_token=${loginJson.token}`
    },
    body: new URLSearchParams({ pw: normalizedPassword }),
    cache: "no-store"
  });

  const html = await profileResponse.text();
  return parseProfileHtml(html, normalizedId);
}
