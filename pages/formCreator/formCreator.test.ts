import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";
import type { PageContextServer } from "vike/types";
import { insertForm, getFormById } from "../../database/postgres/queries/forms";
import { data } from "./+data";

test("clone loads the original layout and saves a separate form", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    const previousBaseUrl = process.env.BASE_URL;
    process.env.BASE_URL = "http://localhost";
    try {
        await sql`CREATE TEMP TABLE forms (
            form_id serial primary key, name text not null, layout jsonb not null
        )`;
        const layout = [
            { columns: [
                { field: { label: "Objaw", type: "text" as const, required: true } },
                { field: null },
            ] },
            { columns: [{ field: { label: "Sekcja", type: "label" as const, required: true } }] },
        ];
        await insertForm(sql, "Oryginał", layout);
        const context = (urlOriginal: string) => ({ db: sql, urlOriginal }) as PageContextServer;
        const clone = await data(context("/formCreator?cloneFrom=1"));
        assert.equal(clone.mode, "clone");
        assert.deepEqual(clone.form?.layout, layout);
        assert.equal(clone.form?.name, "Oryginał");
        assert.equal((await data(context("/formCreator?formId=1"))).mode, "edit");
        assert.equal((await data(context("/formCreator"))).mode, "create");
        await assert.rejects(data(context("/formCreator?cloneFrom=999")));
        await assert.rejects(data(context("/formCreator?cloneFrom=0")));
        await assert.rejects(data(context("/formCreator?cloneFrom=2147483648")));
        await assert.rejects(data(context("/formCreator?cloneFrom=1&formId=1")));

        await insertForm(sql, "Kopia", clone.form!.layout);
        const [original] = await getFormById(sql, 1);
        const [copy] = await getFormById(sql, 2);
        assert.equal(original.name, "Oryginał");
        assert.equal(copy.name, "Kopia");
        assert.deepEqual(copy.layout, original.layout);
    } finally {
        if (previousBaseUrl === undefined) delete process.env.BASE_URL;
        else process.env.BASE_URL = previousBaseUrl;
        await sql.end();
    }
});
