import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";
import { getDeletedPatients, getPatient, getPatientsList, getRecentPatients, setPatientDeleted, updatePatientForm, updatePatientForms } from "../../../database/postgres/queries/patient";
import type { PatientFormEntry } from "../../../types/form";
import { getFormPreview } from "./formPreview";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PrintableForm } from "../../../components/PrintableForm";

test("preview contains up to five filled values in field order", () => {
    const form: PatientFormEntry = {
        form_id: 1, name: "Test", completed: true,
        layout: [{ columns: [
            { field: null },
            { field: { label: "Nagłówek", type: "label", required: false, value: "ignored" } },
            { field: { label: "Puste", type: "text", required: false, value: " " } },
            { field: { label: "Opcja", type: "checkbox", required: false, value: "false" } },
            ...["A", "B", "C", "D", "E"].map((label) => ({
                field: { label, type: "text" as const, required: false, value: label },
            })),
        ] }],
    };
    assert.deepEqual(getFormPreview(form), [
        { label: "Opcja", value: "Nie" },
        { label: "A", value: "A" },
        { label: "B", value: "B" },
        { label: "C", value: "C" },
        { label: "D", value: "D" },
    ]);
    assert.deepEqual(getFormPreview({ ...form, layout: [] }), []);
});

test("printable preview displays values and checkbox states", () => {
    const form: PatientFormEntry = {
        form_id: 1, name: "Wywiad", layout: [{ columns: [
            { field: { label: "Objaw", type: "text", required: false, value: "Ból" } },
            { field: { label: "Zgoda", type: "checkbox", required: false, value: "true" } },
            { field: { label: "Sekcja", type: "label", required: false } },
        ] }],
    };
    const html = renderToStaticMarkup(React.createElement(PrintableForm, { title: form.name, layout: form.layout, showValues: true }));
    assert.match(html, /Ból/);
    assert.match(html, /Zaznaczono/);
    assert.match(html, /Sekcja/);
    const template = renderToStaticMarkup(React.createElement(PrintableForm, { title: form.name, layout: form.layout }));
    assert.doesNotMatch(template, /Ból/);
    assert.match(template, /aria-hidden="true"/);
});

test("updates one form without overwriting other forms", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
        await sql`CREATE TEMP TABLE patient (
            patient_id serial primary key,
            patient_unq_id text not null,
            first_visit_date text,
            start_forms jsonb not null,
            is_deleted boolean not null default false
        )`;
        await sql`INSERT INTO patient (patient_unq_id, first_visit_date, start_forms) VALUES ('test', '01-01-2024', '[]'::jsonb)`;
        const first: PatientFormEntry = {
            form_id: 1, name: "Pierwszy", completed: true,
            layout: [{ columns: [{ field: { label: "Wartość", type: "text", required: true, value: "stara" } }] }],
        };
        const second: PatientFormEntry = { form_id: 2, name: "Drugi", completed: true, layout: [] };
        const unfinished: PatientFormEntry = { form_id: 3, name: "Roboczy", layout: [] };
        await updatePatientForms(sql, 1, [first, second, unfinished]);
        const updated: PatientFormEntry = {
            ...first,
            layout: [{ columns: [{ field: { label: "Wartość", type: "text", required: true, value: "nowa" } }] }],
        };
        assert.equal((await updatePatientForm(sql, 1, updated)).length, 1);
        const [patient] = await getPatient(sql, 1);
        assert.deepEqual(patient.start_forms, [updated, second, unfinished]);
        const draft = { ...unfinished, completed: false, name: "Częściowy" };
        assert.equal((await updatePatientForm(sql, 1, draft)).length, 1);
        assert.deepEqual((await getPatient(sql, 1))[0].start_forms, [updated, second, draft]);
        const finished = { ...draft, completed: true };
        assert.equal((await updatePatientForm(sql, 1, finished)).length, 1);
        assert.equal((await updatePatientForm(sql, 1, { ...updated, form_id: 99 })).length, 0);
        assert.equal((await updatePatientForm(sql, 999, updated)).length, 0);
        assert.deepEqual((await getPatient(sql, 1))[0].start_forms, [updated, second, finished]);
        assert.equal((await getPatient(sql, 999)).length, 0);
    } finally {
        await sql.end();
    }
});

test("trash hides patients and preserves forms and visits when restored", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
        await sql`CREATE TEMP TABLE patient (
            patient_id serial primary key, patient_unq_id text not null unique,
            first_visit_date text, start_forms jsonb not null, is_deleted boolean not null default false
        )`;
        await sql`CREATE TEMP TABLE visits (id serial primary key, patient_id integer not null, date date not null, time time not null, forms_data jsonb not null)`;
        const form: PatientFormEntry = { form_id: 1, name: "Test", completed: true, layout: [] };
        await sql`INSERT INTO patient (patient_unq_id, first_visit_date, start_forms) VALUES ('test', '01-01-2024', ${sql.json([form])})`;
        await sql`INSERT INTO visits (patient_id, date, time, forms_data) VALUES (1, '2025-01-01', '12:00', ${sql.json([form])})`;
        const filters = { terms: ["test"], visitDate: "" };
        assert.equal((await getPatientsList(sql, filters, 1)).total, 1);
        assert.equal((await setPatientDeleted(sql, 1, true)).length, 1);
        assert.equal((await setPatientDeleted(sql, 1, true)).length, 0);
        assert.equal((await getPatient(sql, 1)).length, 0);
        assert.equal((await getPatientsList(sql, filters, 1)).total, 0);
        assert.equal((await getRecentPatients(sql)).length, 0);
        assert.deepEqual(await getDeletedPatients(sql), [{ patient_id: 1, patient_unq_id: "test" }]);
        assert.equal((await updatePatientForms(sql, 1, [])).length, 0);
        assert.equal((await updatePatientForm(sql, 1, form)).length, 0);
        await assert.rejects(sql`INSERT INTO patient (patient_unq_id, start_forms) VALUES ('test', '[]')`);
        assert.equal((await setPatientDeleted(sql, 1, false)).length, 1);
        assert.equal((await setPatientDeleted(sql, 1, false)).length, 0);
        assert.equal((await getDeletedPatients(sql)).length, 0);
        assert.deepEqual((await getPatient(sql, 1))[0].start_forms, [form]);
        assert.equal((await getPatientsList(sql, filters, 1)).total, 1);
        assert.equal((await getRecentPatients(sql))[0].last_visit_date, "01-01-2025");
        assert.deepEqual((await sql`SELECT forms_data FROM visits WHERE patient_id = 1`)[0].forms_data, [form]);
    } finally {
        await sql.end();
    }
});
