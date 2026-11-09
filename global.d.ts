import type { db as pgDb } from "./database/postgres/db";
import type { SessionUser } from "./server/auth";

declare global {
    namespace Vike {
        interface PageContextServer {
            db: ReturnType<typeof pgDb>;
        }
        interface PageContext {
            user: SessionUser | null;
        }
    }
}

declare module "telefunc" {
    namespace Telefunc {
        interface Context {
            db: ReturnType<typeof pgDb>;
            user: SessionUser | null;
        }
    }
}

export { };
