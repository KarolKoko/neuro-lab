import { dbMiddleware } from "./db-middleware";
import { sessionMiddleware } from "./session-middleware";
import { telefuncHandler } from "./telefunc-handler";
import vike from "@vikejs/hono";
import HonoInstance from "./hono-instance";

function getApp() {
    vike(HonoInstance, [
        // Make the logged-in user available as `context.user` (merged into pageContext.user)
        sessionMiddleware,
        // Make database available in Context as `context.db`
        dbMiddleware,
        // Telefunc route. See https://telefunc.com
        telefuncHandler,
    ]);

    return HonoInstance;
}

export const app = getApp();
