import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export type Role = "admin" | "moderator" | "default";
export type Restriction = "none" | "warning" | "ban";

export interface TPassClaims {
  sub: string;
  email: string;
  name: string;
  permissions: Record<string, { read?: boolean; role?: string; restriction?: Restriction; reason?: string }>;
  exp: number;
  iat?: number;
}

const DEV_SECRET = process.env.AUTH_DEV_SECRET || "tpass-notes-dev-secret";

function getServiceId() {
  return process.env.TPASS_SERVICE_ID || "notes";
}

function normalizePermissions(permissions: TPassClaims["permissions"] | undefined): TPassClaims["permissions"] {
  const service = getServiceId();
  const entry = permissions?.[service] ?? { read: true, role: "default" };
  return {
    ...(permissions ?? {}),
    [service]: {
      read: entry.read ?? true,
      role: (entry.role as Role | undefined) ?? "default",
      restriction: (entry.restriction as Restriction | undefined) ?? "none",
      reason: entry.reason ?? "",
    },
  };
}

export async function signDemoToken(claims: Omit<TPassClaims, "exp" | "iat">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    ...claims,
    permissions: normalizePermissions(claims.permissions),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 8)
    .sign(new TextEncoder().encode(DEV_SECRET));
}

export async function verifySession(token: string): Promise<TPassClaims | null> {
  try {
    if (process.env.AUTH_DEV_MODE === "true") {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(DEV_SECRET), {
        issuer: process.env.JWT_ISSUER || "https://auth.tschoolsu.org",
        audience: `tpass:${getServiceId()}`,
      });
      const permissions = normalizePermissions(payload.permissions as TPassClaims["permissions"] | undefined);
      return {
        sub: String(payload.sub || ""),
        email: String(payload.email || ""),
        name: String(payload.name || ""),
        permissions,
        exp: Number(payload.exp || 0),
        iat: Number(payload.iat || 0),
      };
    }

    const jwksUrl = process.env.AUTH_JWKS_URL;
    if (!jwksUrl) {
      return null;
    }

    const { createRemoteJWKSet } = await import("jose");
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.JWT_ISSUER || "https://auth.tschoolsu.org",
      audience: `tpass:${getServiceId()}`,
    });
    const permissions = normalizePermissions(payload.permissions as TPassClaims["permissions"] | undefined);
    return {
      sub: String(payload.sub || ""),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      permissions,
      exp: Number(payload.exp || 0),
      iat: Number(payload.iat || 0),
    };
  } catch {
    return null;
  }
}

export const getSession = cache(async (): Promise<TPassClaims | null> => {
  const token = (await cookies()).get("tpass_token")?.value;
  if (!token) return null;
  return verifySession(token);
});

export function getPermissionEntry(session: TPassClaims | null | undefined) {
  const service = getServiceId();
  const entry = session?.permissions?.[service] ?? { read: true, role: "default", restriction: "none" as Restriction, reason: "" };
  return {
    read: entry.read ?? true,
    role: (entry.role as Role | undefined) ?? "default",
    restriction: (entry.restriction as Restriction | undefined) ?? "none",
    reason: entry.reason ?? "",
  };
}

export async function requireSession(returnPath = "/") {
  const session = await getSession();
  if (!session) redirect(`/api/auth/login?next=${encodeURIComponent(returnPath)}`);
  return session;
}

export function isAdmin(session: TPassClaims | null | undefined) {
  return getPermissionEntry(session).role === "admin";
}

export function isModerator(session: TPassClaims | null | undefined) {
  const role = getPermissionEntry(session).role;
  return role === "moderator" || role === "admin";
}

export function canManage(session: TPassClaims | null | undefined) {
  return isAdmin(session) || isModerator(session);
}
