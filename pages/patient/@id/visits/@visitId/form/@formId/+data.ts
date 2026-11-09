import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { data as getVisitData } from "../../+data";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const rawId = pageContext.routeParams.formId;
    if (!/^[1-9]\d*$/.test(rawId)) throw render(404);
    const formId = Number(rawId);
    if (!Number.isSafeInteger(formId) || formId > 2147483647) throw render(404);
    const { patientId, patientIdentifier, visit } = await getVisitData(pageContext);
    const form = visit.forms_data.find((entry) => entry.form_id === formId);
    if (!form) throw render(404);
    return { patientId, patientIdentifier, visitId: visit.id, form };
}
