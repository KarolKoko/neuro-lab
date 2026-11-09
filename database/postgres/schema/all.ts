import "../../../server/load";
import { db } from "../db";

await import("./forms");
await import("./patient");
await import("./visits");

// db() is a shared singleton, so the connection is closed once after all schemas ran
await db().end();
