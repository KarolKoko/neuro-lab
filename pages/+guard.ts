// https://vike.dev/guard
// Applies to all pages (except where overridden, e.g. pages/login/+guard.ts).

import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";

export function guard(pageContext: PageContextServer) {
    if (!pageContext.user) {
        // Renders /login while preserving the original URL, so the user lands back where they started.
        throw render("/login");
    }
}
