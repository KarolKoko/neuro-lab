import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getVisits, VISITS_PAGE_SIZE } from "../../../../database/postgres/queries/visits";
import { parseVisitDate } from "../../../patients/filters";
import { data as getPatientData } from "../+data";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: Pick<PageContextServer, "routeParams" | "db" | "urlOriginal">) {
    const { patient } = await getPatientData(pageContext);
    const params = new URL(pageContext.urlOriginal, "http://localhost").searchParams;
    const page = Number(params.get("page") ?? "1");
    const date = params.get("date") ?? "";
    if (!Number.isSafeInteger(page) || page < 1 || (page - 1) * VISITS_PAGE_SIZE > Number.MAX_SAFE_INTEGER ||
        parseVisitDate(date) === null) throw render(404);
    const terms = params.getAll("q").map((term) => term.trim()).filter(Boolean);
    const result = await getVisits(pageContext.db, patient.patient_id, { terms, date }, page);
    return {
        ...result,
        patientId: patient.patient_id,
        patientIdentifier: patient.patient_unq_id,
        firstVisit: {
            date: patient.first_visit_date,
            time: patient.first_visit_time,
            formNames: patient.start_forms.map((form) => form.name),
        },
        terms, date, page, pageSize: VISITS_PAGE_SIZE,
    };
}
