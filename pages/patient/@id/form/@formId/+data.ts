import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { data as getPatientData } from "../../+data";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const rawFormId = pageContext.routeParams.formId;
    if (!/^[1-9]\d*$/.test(rawFormId)) throw render(404);
    const formId = Number(rawFormId);
    if (!Number.isSafeInteger(formId) || formId > 2147483647) throw render(404);
    const { patient } = await getPatientData(pageContext);
    const form = patient.start_forms.find((entry) => entry.form_id === formId);
    if (!form) throw render(404);
    return { patientId: patient.patient_id, patientIdentifier: patient.patient_unq_id, form };
}
