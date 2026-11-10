import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import * as pgQueries from "../../database/postgres/queries/forms";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
        throw new Error("Missing required environment variable: BASE_URL");
    }

    const params = new URL(
        pageContext.urlOriginal,
        baseUrl,
    ).searchParams;
    const formIdParam = params.get("formId");
    const cloneFromParam = params.get("cloneFrom");

    if (formIdParam !== null && cloneFromParam !== null) {
        throw render(404);
    }

    const sourceId = formIdParam ?? cloneFromParam;
    if (sourceId === null) {
        return { form: null, mode: "create" as const };
    }

    const formId = Number(sourceId);
    if ((cloneFromParam !== null && !/^[1-9]\d*$/.test(sourceId)) ||
        !Number.isSafeInteger(formId) || formId < 1 || formId > 2147483647) {
        throw render(404);
    }

    const [form] = await pgQueries.getFormById(pageContext.db, formId);
    if (!form) {
        throw render(404);
    }

    return { form, mode: cloneFromParam === null ? "edit" as const : "clone" as const };
}
