import "../../../server/load";
import { db } from "../db";
import "./forms";
import "./patient";

// db() is a shared singleton, so the connection is closed once after all schemas ran
await db().end();
