import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getPatient } from "../../../database/postgres/queries/patient";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const rawId = pageContext.routeParams.id;
    if (!/^[1-9]\d*$/.test(rawId)) throw render(404);
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id > 2147483647) throw render(404);

    const [patient] = await getPatient(pageContext.db, id);
    if (!patient) throw render(404);
    if (!Array.isArray(patient.start_forms)) {
        throw new Error(`Nieprawidłowe dane formularzy pacjenta o ID ${id}.`);
    }
    return { patient };
}
