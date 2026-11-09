import { parseSigned } from "hono/utils/cookie";
import { enhance, type UniversalMiddleware } from "@universal-middleware/core";
import { SESSION_COOKIE, type SessionUser } from "./auth";

declare global {
    namespace Universal {
        interface Context {
            user: SessionUser | null;
        }
    }
}

/**
 * Populates `context.user` (merged into `pageContext.user`) from the signed session cookie,
 * so pages/telefunc functions and the +guard() hook can check authentication.
 */
export const sessionMiddleware: UniversalMiddleware = enhance(
    async (request, context, _runtime) => {
        const user = await readSessionUser(request);

        return {
            ...context,
            user,
        };
    },
    {
        name: "my-app:session-middleware",
        immutable: false,
    },
);

async function readSessionUser(request: Request): Promise<SessionUser | null> {
    const secret = process.env.SESSION_SECRET;
    const cookieHeader = request.headers.get("cookie");
    if (!secret || !cookieHeader) return null;

    const signed = await parseSigned(cookieHeader, secret, SESSION_COOKIE);
    const value = signed[SESSION_COOKIE];
    if (!value) return null;

    try {
        return JSON.parse(value) as SessionUser;
    } catch {
        return null;
    }
}
