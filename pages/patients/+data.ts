import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import { getPatientsList, PATIENTS_PAGE_SIZE } from "../../database/postgres/queries/patient";
import { filtersFromInput } from "./filters";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const params = new URL(pageContext.urlOriginal, "http://localhost").searchParams;
    const page = Number(params.get("page") ?? "1");
    const patientIdParam = params.get("patient");
    const patientId = patientIdParam === null ? undefined : Number(patientIdParam);
    if (!Number.isSafeInteger(page) || page < 1 || (page - 1) * PATIENTS_PAGE_SIZE > Number.MAX_SAFE_INTEGER) {
        throw render(404);
    }
    const terms = params.getAll("q");
    const date = params.get("date") ?? "";
    let filters;
    try {
        filters = filtersFromInput(terms, date, patientId);
    } catch {
        throw render(404);
    }
    const result = await getPatientsList(pageContext.db, filters, page);
    return { ...result, page, terms: filters.terms, date, patientId, pageSize: PATIENTS_PAGE_SIZE };
}
