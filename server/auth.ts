import { getSignedCookie, setSignedCookie, deleteCookie } from 'hono/cookie'
import type { Context } from 'hono'

export const SESSION_COOKIE = 'auth_session'

export interface SessionUser {
    id: string
    name: string
    email: string
}

// Session cookies are signed (HMAC) so tampering is detectable, and only readable by the server (httpOnly).
function getSessionSecret(): string {
    const secret = process.env.SESSION_SECRET
    if (!secret || secret.length < 32) {
        throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters')
    }
    return secret
}

export async function setSession(c: Context, user: SessionUser) {
    await setSignedCookie(c, SESSION_COOKIE, JSON.stringify(user), getSessionSecret(), {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production; relaxed for local dev over http
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
    })
}

export async function getSessionUser(c: Context): Promise<SessionUser | null> {
    const value = await getSignedCookie(c, getSessionSecret(), SESSION_COOKIE)
    if (!value) return null
    try {
        return JSON.parse(value) as SessionUser
    } catch {
        return null
    }
}

export function clearSession(c: Context) {
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
}