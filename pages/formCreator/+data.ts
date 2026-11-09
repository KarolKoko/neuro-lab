import { render } from "vike/abort";
import type { PageContextServer } from "vike/types";
import * as pgQueries from "../../database/postgres/queries/forms";

export type Data = Awaited<ReturnType<typeof data>>;

export async function data(pageContext: PageContextServer) {
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
        throw new Error("Missing required environment variable: BASE_URL");
    }

    const formIdParam = new URL(
        pageContext.urlOriginal,
        baseUrl,
    ).searchParams.get("formId");

    if (formIdParam === null) {
        return { form: null };
    }

    const formId = Number(formIdParam);
    if (!Number.isSafeInteger(formId) || formId < 1) {
        throw render(404);
    }

    const [form] = await pgQueries.getFormById(pageContext.db, formId);
    if (!form) {
        throw render(404);
    }

    return { form };
}
