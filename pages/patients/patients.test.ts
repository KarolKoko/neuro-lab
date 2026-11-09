import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";
import { getPatientsList, getRecentPatients, updatePatientForms } from "../../database/postgres/queries/patient";
import type { PatientFormEntry } from "../../types/form";
import { filtersFromInput, matchingFields } from "./filters";

test("validates visit dates and patient identifiers", () => {
    assert.equal(filtersFromInput(["  Alpha ", ""], "2024-02-29").visitDate, "29-02-2024");
    assert.deepEqual(filtersFromInput(["  Alpha ", ""], "").terms, ["Alpha"]);
    assert.throws(() => filtersFromInput([], "2023-02-29"));
    assert.throws(() => filtersFromInput([], "", 0));
});

test("recent patients use visit date, first visit fallback and limit of five", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
        await sql`CREATE TEMP TABLE patient (patient_id serial primary key, patient_unq_id text not null, first_visit_date text)`;
        await sql`CREATE TEMP TABLE visits (id serial primary key, patient_id integer not null, date date not null)`;
        assert.deepEqual(await getRecentPatients(sql), []);
        await sql`INSERT INTO patient (patient_unq_id, first_visit_date) VALUES
            ('Pierwszy', '01-01-2024'), ('Drugi', '31-12-2024'),
            ('Trzeci', '01-01-2025'), ('Czwarty', '15-01-2025'),
            ('Piąty', '20-01-2025'), ('Szósty', NULL), ('Siódmy', '01-12-2023')`;
        await sql`INSERT INTO visits (patient_id, date) VALUES (1, '2025-02-01'), (1, '2025-03-01'), (6, '2024-11-01'), (7, '2025-01-20')`;
        const recent = await getRecentPatients(sql);
        assert.deepEqual(recent.map((patient) => patient.patient_id), [1, 7, 5, 4, 3]);
        assert.deepEqual(recent.map((patient) => patient.last_visit_date), ["01-03-2025", "20-01-2025", "20-01-2025", "15-01-2025", "01-01-2025"]);
        await sql`DELETE FROM visits WHERE patient_id = 1`;
        assert.ok(!(await getRecentPatients(sql)).some((patient) => patient.patient_id === 1));
    } finally {
        await sql.end();
    }
});

test("finds values with their labels, not section headings", () => {
    const patient = {
        patient_id: 1,
        patient_unq_id: "A",
        first_visit_date: null,
        start_forms: [{
            form_id: 1, name: "Test", layout: [{ columns: [
                { field: { label: "Uwagi", type: "text" as const, required: false, value: "Ból głowy" } },
                { field: { label: "Nagłówek", type: "label" as const, required: false, value: "Ból" } },
            ] }],
        }],
    };
    assert.deepEqual(matchingFields(patient, ["GŁOWY"]), [{ label: "Uwagi", value: "Ból głowy" }]);
});

test("queries and updates patients in an isolated temporary table", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
        await sql`CREATE TEMP TABLE patient (
            patient_id serial primary key,
            patient_unq_id text not null,
            first_visit_date text,
            start_forms jsonb not null
        )`;
        await sql`CREATE TEMP TABLE visits (id serial primary key, patient_id integer not null, date date not null, time time not null, forms_data jsonb not null)`;
        await sql`INSERT INTO patient (patient_unq_id, first_visit_date, start_forms)
            SELECT 'patient-' || lpad(n::text, 3, '0'), '29-02-2024', '[]'::jsonb
            FROM generate_series(1, 101) n`;
        const form: PatientFormEntry = {
            form_id: 1, name: "Wywiad", completed: true,
            layout: [{ columns: [{ field: { label: "Objaw", type: "text", required: false, value: "ból głowy 100%" } }] }],
        };
        await updatePatientForms(sql, 101, [form]);
        const empty = filtersFromInput([], "");
        const first = await getPatientsList(sql, empty, 1);
        const second = await getPatientsList(sql, empty, 2);
        assert.equal(first.total, 101);
        assert.equal(first.patients.length, 100);
        assert.equal(second.patients.length, 1);
        assert.equal(second.patients[0].start_forms[0].completed, true);

        const matches = await getPatientsList(sql, filtersFromInput(["patient-001", "GŁOWY"], "2024-02-29"), 1);
        assert.equal(matches.total, 2);
        assert.deepEqual(matchingFields(matches.patients[1], ["GŁOWY"]), [{ label: "Objaw", value: "ból głowy 100%" }]);
        assert.equal((await getPatientsList(sql, filtersFromInput(["%"], ""), 1)).total, 1);
        assert.equal((await getPatientsList(sql, filtersFromInput(["głowy"], "2024-03-01"), 1)).total, 0);
        assert.equal((await getPatientsList(sql, filtersFromInput([], "", 101), 1)).total, 1);
        assert.ok((await getPatientsList(sql, filtersFromInput(["101"], ""), 1)).patients.some((patient) => patient.patient_id === 101));
        assert.equal((await getPatientsList(sql, empty, 3)).patients.length, 0);
        await sql`INSERT INTO visits (patient_id, date, time, forms_data)
            VALUES (101, '2025-03-04', '10:00', '[]'), (101, '2025-04-04', '11:00', '[]')`;
        const latest = await getPatientsList(sql, filtersFromInput([], "2025-04-04"), 1);
        assert.equal(latest.total, 1);
        assert.equal(latest.patients[0].last_visit_date, "04-04-2025");
        assert.equal((await getPatientsList(sql, filtersFromInput(["patient-101"], "2024-02-29"), 1)).total, 0);
        const visitForm: PatientFormEntry = {
            form_id: 2, name: "Wizyta", completed: true,
            layout: [{ columns: [{ field: { label: "Rozpoznanie", type: "text", required: false, value: "wizyta objaw" } }] }],
        };
        await sql`UPDATE visits SET forms_data = ${sql.json([visitForm])} WHERE patient_id = 101 AND date = '2025-04-04'`;
        const byVisitValue = await getPatientsList(sql, filtersFromInput(["wizyta objaw"], ""), 1);
        assert.equal(byVisitValue.total, 1);
        assert.deepEqual(matchingFields(byVisitValue.patients[0], ["wizyta objaw"]), [{ label: "Rozpoznanie", value: "wizyta objaw" }]);
        assert.equal(byVisitValue.patients[0].visit_forms?.[0].name, "Wizyta");
    } finally {
        await sql.end();
    }
});
