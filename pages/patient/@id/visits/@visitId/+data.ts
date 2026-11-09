import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getVisit } from "../../../../../database/postgres/queries/visits";
import { data as getPatientData } from "../../+data";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const rawId = pageContext.routeParams.visitId;
    if (!/^[1-9]\d*$/.test(rawId)) throw render(404);
    const visitId = Number(rawId);
    if (!Number.isSafeInteger(visitId) || visitId > 2147483647) throw render(404);
    const { patient } = await getPatientData(pageContext);
    const [visit] = await getVisit(pageContext.db, patient.patient_id, visitId);
    if (!visit) throw render(404);
    if (!Array.isArray(visit.forms_data)) throw new Error(`Nieprawidłowe dane formularzy wizyty ${visitId}.`);
    return { patientId: patient.patient_id, patientIdentifier: patient.patient_unq_id, visit };
}
