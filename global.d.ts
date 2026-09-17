import type { db as pgDb } from "./database/postgres/db";

declare global {
  namespace Vike {
    interface PageContextServer {
      db: ReturnType<typeof pgDb>;
    }
  }
}

declare module "telefunc" {
  namespace Telefunc {
    interface Context {
      db: ReturnType<typeof pgDb>;
    }
  }
}

export {};
