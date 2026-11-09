import { render } from "vike/abort";
import * as pgQueries from "../../database/postgres/queries/patient";
import type { PageContextServer } from "vike/types";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(_pageContext: PageContextServer) {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
        throw new Error("Missing required environment variable: BASE_URL");
    }

    const pageParam = new URL(
        _pageContext.urlOriginal,
        baseUrl,
    ).searchParams.get("page");

    if (pageParam === null) {
        return { patients: [] };
    }

    const page = Number(pageParam);
    if (!Number.isSafeInteger(page) || page < 1) {
        throw render(404);
    }

    const patients = await pgQueries.getPatientsList(_pageContext.db, page);

    return { patients };
}