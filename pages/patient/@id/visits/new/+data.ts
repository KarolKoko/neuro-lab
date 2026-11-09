import type { PageContextServer } from "vike/types";
import { data as getPatientData } from "../../+data";
import { getForms } from "../../../../../database/postgres/queries/forms";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const { patient } = await getPatientData(pageContext);
    const forms = await getForms(pageContext.db);
    return {
        patientId: patient.patient_id,
        patientIdentifier: patient.patient_unq_id,
        forms: Array.from(forms, (form) => ({ formId: form.form_id as number, name: form.name as string })),
    };
}
