import type { PageContextServer } from "vike/types";
import { getDeletedPatients } from "../../database/postgres/queries/patient";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    return { patients: await getDeletedPatients(pageContext.db) };
}
