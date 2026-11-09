import type { PageContextServer } from "vike/types";
import { getRecentPatients } from "../../database/postgres/queries/patient";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const recentPatients = await getRecentPatients(pageContext.db);
    return { recentPatients };
}
