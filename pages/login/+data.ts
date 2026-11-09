// https://vike.dev/data

import type { PageContextServer } from "vike/types";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    // pageContext.urlOriginal is the protected URL the user originally requested (preserved by
    // the guard()'s `throw render('/login')`), or "/login" itself when visited directly.
    const redirectTo = pageContext.urlOriginal && pageContext.urlOriginal !== "/login" ? pageContext.urlOriginal : "/";

    return { redirectTo, alreadyLoggedIn: pageContext.user !== null };
}
