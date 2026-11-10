import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";
import { createVisit, getVisit, getVisits, updateVisitForm, VISITS_PAGE_SIZE } from "../../../../database/postgres/queries/visits";
import { validatePatientForm } from "../../../../server/patient-form-validation";
import type { PatientFormEntry } from "../../../../types/form";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FirstVisitRow } from "./FirstVisitRow";
import { data as getVisitsPageData } from "./+data";

const draft: PatientFormEntry = {
    form_id: 1, name: "Wywiad", completed: false,
    layout: [{ columns: [{ field: { label: "Objaw", type: "text", required: true, value: "" } }] }],
};

test("validates draft and completed forms", () => {
    assert.doesNotThrow(() => validatePatientForm(draft));
    assert.throws(() => validatePatientForm({ ...draft, completed: true }));
});

test("first visit row displays date, time, forms and patient details link", () => {
    const html = renderToStaticMarkup(React.createElement(FirstVisitRow, {
        patientId: 7, date: "02-01-2024", time: "09:15:00", formNames: ["Wywiad", "Badanie"],
    }));
    assert.match(html, /02-01-2024/);
    assert.match(html, /09:15:00/);
    assert.match(html, /Wywiad, Badanie/);
    assert.match(html, /href="\/patient\/7"/);
    assert.match(html, /Pierwsza wizyta/);
    const missing = renderToStaticMarkup(React.createElement(FirstVisitRow, {
        patientId: 7, date: null, time: null, formNames: [],
    }));
    assert.equal((missing.match(/—/g) ?? []).length, 3);
});

test("first visit is provided separately on every page and does not change visit filtering", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
        await sql`CREATE TEMP TABLE patient (
            patient_id integer primary key, patient_unq_id text not null,
            first_visit_date text, first_visit_time text, start_forms jsonb not null,
            is_deleted boolean not null default false
        )`;
        await sql`CREATE TEMP TABLE visits (id serial primary key, patient_id integer not null, date date not null, time time not null, forms_data jsonb not null)`;
        const forms = [draft, { form_id: 2, name: "Badanie", layout: [] }];
        await sql`INSERT INTO patient VALUES (1, 'test', '02-01-2024', '09:15:00', ${sql.json(forms)}, false)`;
        await sql`INSERT INTO visits (patient_id, date, time, forms_data)
            SELECT 1, '2025-01-01', '12:00', '[]'::jsonb FROM generate_series(1, 101)`;
        const context = (urlOriginal: string) => ({
            db: sql, urlOriginal, routeParams: { id: "1" },
        });
        const first = await getVisitsPageData(context("/patient/1/visits"));
        assert.deepEqual(first.firstVisit, { date: "02-01-2024", time: "09:15:00", formNames: ["Wywiad", "Badanie"] });
        assert.equal(first.total, 101);
        assert.equal(first.visits.length, 100);
        const second = await getVisitsPageData(context("/patient/1/visits?page=2"));
        assert.deepEqual(second.firstVisit, first.firstVisit);
        assert.equal(second.visits.length, 1);
        const filtered = await getVisitsPageData(context("/patient/1/visits?date=2024-01-02"));
        assert.deepEqual(filtered.firstVisit, first.firstVisit);
        assert.equal(filtered.total, 0);
        assert.equal(filtered.visits.length, 0);
    } finally {
        await sql.end();
    }
});

test("visit creation, search, pagination and isolated form updates", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
        await sql`CREATE TEMP TABLE patient (patient_id integer primary key, is_deleted boolean not null default false)`;
        await sql`INSERT INTO patient (patient_id) VALUES (1), (2)`;
        await sql`CREATE TEMP TABLE visits (id serial primary key, patient_id integer not null, date date not null, time time not null, forms_data jsonb not null)`;
        const otherForm: PatientFormEntry = { form_id: 2, name: "Badanie", completed: true, layout: [] };
        const [visit] = await createVisit(sql, 1, "2024-02-29", "12:30:00", [draft, otherForm]);
        await createVisit(sql, 2, "2024-02-29", "12:30:00", [draft]);
        const finished: PatientFormEntry = {
            ...draft, completed: true,
            layout: [{ columns: [{ field: { label: "Objaw", type: "text", required: true, value: "Ból 100%" } }] }],
        };
        assert.equal((await updateVisitForm(sql, 2, visit.id, finished)).length, 0);
        assert.equal((await updateVisitForm(sql, 1, visit.id, finished)).length, 1);
        assert.deepEqual((await getVisit(sql, 1, visit.id))[0].forms_data, [finished, otherForm]);
        assert.equal((await getVisit(sql, 2, visit.id)).length, 0);
        assert.equal((await updateVisitForm(sql, 1, visit.id, { ...finished, form_id: 99 })).length, 0);
        assert.equal((await getVisits(sql, 1, { terms: ["niedopasowana", "ból"], date: "2024-02-29" }, 1)).total, 1);
        assert.equal((await getVisits(sql, 2, { terms: ["ból"], date: "" }, 1)).total, 0);
        assert.equal((await getVisits(sql, 1, { terms: ["%"], date: "" }, 1)).total, 1);
        assert.equal((await getVisits(sql, 1, { terms: ["badanie"], date: "" }, 1)).total, 1);
        assert.equal((await getVisits(sql, 1, { terms: [], date: "2024-03-01" }, 1)).total, 0);
        await sql`INSERT INTO visits (patient_id, date, time, forms_data)
            SELECT 1, '2025-01-01', '12:00', '[]'::jsonb FROM generate_series(1, 100)`;
        assert.equal((await getVisits(sql, 1, { terms: [], date: "" }, 1)).visits.length, VISITS_PAGE_SIZE);
        assert.equal((await getVisits(sql, 1, { terms: [], date: "" }, 2)).visits.length, 1);
        await sql`UPDATE patient SET is_deleted = true WHERE patient_id = 1`;
        assert.equal((await createVisit(sql, 1, "2024-02-29", "12:30:00", [draft])).length, 0);
        assert.equal((await getVisit(sql, 1, visit.id)).length, 0);
        assert.equal((await getVisits(sql, 1, { terms: [], date: "" }, 1)).total, 0);
        assert.equal((await updateVisitForm(sql, 1, visit.id, finished)).length, 0);
        await sql`UPDATE patient SET is_deleted = false WHERE patient_id = 1`;
        assert.deepEqual((await getVisit(sql, 1, visit.id))[0].forms_data, [finished, otherForm]);
    } finally {
        await sql.end();
    }
});
