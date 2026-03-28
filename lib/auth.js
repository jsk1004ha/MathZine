import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { readCollection, writeCollection } from "@/lib/store";
import { sanitizeText } from "@/lib/security";
import { verifyRiroCredentials } from "@/lib/riro";

const SESSION_COOKIE = "mathzine_session";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24;
const REMEMBERED_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ALLOWED_ROLES = new Set(["member", "reporter", "teacher", "admin"]);

function nowIso() {
  return new Date().toISOString();
}

function buildSessionTtlMs(rememberMe) {
  return rememberMe ? REMEMBERED_SESSION_TTL_MS : DEFAULT_SESSION_TTL_MS;
}

function sessionExpiresAt(rememberMe) {
  return new Date(Date.now() + buildSessionTtlMs(rememberMe)).toISOString();
}

function normalizeNickname(nickname) {
  return sanitizeText(nickname, { maxLength: 24 }).replace(/\s+/g, " ");
}

function normalizeLoginId(loginId) {
  return sanitizeText(loginId, { maxLength: 40 }).toLowerCase();
}

function normalizeRole(role) {
  const nextRole = sanitizeText(role, { maxLength: 20 }).toLowerCase();
  return ALLOWED_ROLES.has(nextRole) ? nextRole : "";
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1";
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash?.includes(":")) {
    return false;
  }

  const [salt, expectedHash] = storedHash.split(":");
  const actualHash = scryptSync(password, salt, 64).toString("hex");

  return timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

async function purgeExpiredSessions() {
  const sessions = await readCollection("sessions");
  const activeSessions = sessions.filter((session) => new Date(session.expiresAt) > new Date());

  if (activeSessions.length !== sessions.length) {
    await writeCollection("sessions", activeSessions);
  }

  return activeSessions;
}

async function createSession(userId, rememberMe = true) {
  const sessions = await purgeExpiredSessions();
  const token = randomBytes(32).toString("hex");

  sessions.push({
    token,
    userId,
    createdAt: nowIso(),
    expiresAt: sessionExpiresAt(rememberMe)
  });

  await writeCollection("sessions", sessions);
  return token;
}

export function applySessionCookie(response, token, rememberMe = true) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rememberMe ? { maxAge: REMEMBERED_SESSION_TTL_MS / 1000 } : {})
  });
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

async function getUserForToken(token) {
  if (!token) {
    return null;
  }

  const [sessions, users] = await Promise.all([purgeExpiredSessions(), readCollection("users")]);
  const activeSession = sessions.find((session) => session.token === token);

  if (!activeSession) {
    return null;
  }

  return users.find((user) => user.id === activeSession.userId) ?? null;
}

function ensureUniqueNickname(users, nickname, excludeUserId = null) {
  const normalizedNickname = normalizeNickname(nickname);

  if (!normalizedNickname) {
    throw new Error("닉네임을 입력해 주세요.");
  }

  const duplicated = users.find(
    (user) => user.nickname?.toLowerCase() === normalizedNickname.toLowerCase() && user.id !== excludeUserId
  );

  if (duplicated) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  return normalizedNickname;
}

function ensureUniqueLoginId(users, loginId, excludeUserId = null) {
  const normalizedLoginId = normalizeLoginId(loginId);

  if (!normalizedLoginId) {
    throw new Error("로그인 아이디를 입력해 주세요.");
  }

  const duplicated = users.find(
    (user) => normalizeLoginId(user.loginId || user.riroId) === normalizedLoginId && user.id !== excludeUserId
  );

  if (duplicated) {
    throw new Error("이미 사용 중인 로그인 아이디입니다.");
  }

  return normalizedLoginId;
}

function sanitizeProfileFields(profile) {
  return {
    name: sanitizeText(profile.name, { maxLength: 40 }),
    student: sanitizeText(profile.student, { maxLength: 60 }),
    studentNumber: sanitizeText(profile.studentNumber, { maxLength: 16 }),
    generation: Number(profile.generation) || null
  };
}

async function upsertLoginMetadata(users, nextUser) {
  const index = users.findIndex((user) => user.riroId === nextUser.riroId);

  if (index === -1) {
    users.push(nextUser);
    return nextUser;
  }

  users[index] = {
    ...users[index],
    ...sanitizeProfileFields(nextUser),
    loginId: normalizeLoginId(nextUser.riroId),
    lastLoginAt: nowIso()
  };

  return users[index];
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getUserForToken(token);
}

export async function getUserFromRequest(request) {
  return getUserForToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function logoutFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return;
  }

  const sessions = await readCollection("sessions");
  await writeCollection(
    "sessions",
    sessions.filter((session) => session.token !== token)
  );
}

export function canManageAdmin(user) {
  return Boolean(user && user.role === "admin");
}

export function canWriteArticles(user) {
  return Boolean(user && (user.role === "admin" || user.role === "reporter"));
}

export function canCreateNotice(user) {
  return canManageAdmin(user);
}

export function canPostBoard(user) {
  return Boolean(user);
}

export function canPreviewArticle(user, article) {
  return Boolean(user && article && (user.role === "admin" || user.id === article.authorId));
}

export async function signUpWithRiro(riroId, password, nickname, options = {}) {
  const profile = await verifyRiroCredentials(riroId, password);
  const users = await readCollection("users");

  if (users.some((user) => normalizeLoginId(user.loginId || user.riroId) === normalizeLoginId(profile.riroId))) {
    throw new Error("이미 가입된 계정입니다. 로그인으로 진행해 주세요.");
  }

  const safeNickname = ensureUniqueNickname(users, nickname);
  const role = users.length === 0 ? "admin" : "member";
  const safeProfile = sanitizeProfileFields(profile);

  const newUser = {
    id: `user_${randomUUID()}`,
    authProvider: "riro",
    loginId: normalizeLoginId(profile.riroId),
    riroId: sanitizeText(profile.riroId, { maxLength: 30 }),
    nickname: safeNickname,
    role,
    createdAt: nowIso(),
    lastLoginAt: nowIso(),
    ...safeProfile
  };

  users.push(newUser);
  await writeCollection("users", users);

  const rememberMe = normalizeBoolean(options.rememberMe);
  const sessionToken = await createSession(newUser.id, rememberMe);
  return { user: newUser, sessionToken, rememberMe };
}

async function loginWithLocalAccount(user, password, rememberMe) {
  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  const users = await readCollection("users");
  const index = users.findIndex((entry) => entry.id === user.id);
  users[index] = {
    ...users[index],
    lastLoginAt: nowIso()
  };
  await writeCollection("users", users);

  const sessionToken = await createSession(user.id, rememberMe);
  return { user: users[index], sessionToken, rememberMe };
}

export async function loginUser(loginId, password, options = {}) {
  const normalizedLogin = normalizeLoginId(loginId);
  const rememberMe = normalizeBoolean(options.rememberMe);
  const users = await readCollection("users");
  const existingUser = users.find((user) => normalizeLoginId(user.loginId || user.riroId) === normalizedLogin);

  if (existingUser?.authProvider === "local") {
    return loginWithLocalAccount(existingUser, password, rememberMe);
  }

  const profile = await verifyRiroCredentials(normalizedLogin, password);

  if (!existingUser) {
    throw new Error("회원가입이 필요합니다. 먼저 가입을 완료해 주세요.");
  }

  const user = await upsertLoginMetadata(users, {
    riroId: profile.riroId,
    ...sanitizeProfileFields(profile)
  });

  await writeCollection("users", users);

  const sessionToken = await createSession(user.id, rememberMe);
  return { user, sessionToken, rememberMe };
}

export async function listUsers() {
  const users = await readCollection("users");
  return [...users].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
}

export async function updateUserRole(targetUserId, role) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    throw new Error("허용되지 않은 역할입니다.");
  }

  const users = await readCollection("users");
  const index = users.findIndex((user) => user.id === targetUserId);

  if (index === -1) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  if (users[index].role === "admin" && normalizedRole !== "admin" && users.filter((user) => user.role === "admin").length === 1) {
    throw new Error("마지막 admin 계정의 권한은 낮출 수 없습니다.");
  }

  users[index] = {
    ...users[index],
    role: normalizedRole
  };

  await writeCollection("users", users);
  return users[index];
}

export async function createAdminManagedUser(payload) {
  const users = await readCollection("users");
  const role = normalizeRole(payload.role || "teacher");

  if (!role) {
    throw new Error("허용되지 않은 역할입니다.");
  }

  const loginId = ensureUniqueLoginId(users, payload.loginId);
  const nickname = ensureUniqueNickname(users, payload.nickname);
  const password = sanitizeText(payload.password, { maxLength: 80 });
  const name = sanitizeText(payload.name, { maxLength: 40 });

  if (!password || password.length < 8) {
    throw new Error("비밀번호는 8자 이상으로 입력해 주세요.");
  }

  if (!name) {
    throw new Error("이름을 입력해 주세요.");
  }

  const newUser = {
    id: `user_${randomUUID()}`,
    authProvider: "local",
    loginId,
    riroId: "",
    passwordHash: hashPassword(password),
    nickname,
    name,
    student: sanitizeText(payload.student, { maxLength: 60 }) || (role === "teacher" ? "교사" : "직접 생성 계정"),
    studentNumber: sanitizeText(payload.studentNumber, { maxLength: 16 }),
    generation: Number(payload.generation) || null,
    role,
    createdAt: nowIso(),
    lastLoginAt: null,
    createdByAdmin: true
  };

  users.push(newUser);
  await writeCollection("users", users);
  return newUser;
}
