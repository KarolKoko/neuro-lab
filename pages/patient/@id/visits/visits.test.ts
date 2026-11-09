import assert from "node:assert/strict";
import { test } from "node:test";
import postgres from "postgres";
import { createVisit, getVisit, getVisits, updateVisitForm, VISITS_PAGE_SIZE } from "../../../../database/postgres/queries/visits";
import { validatePatientForm } from "../../../../server/patient-form-validation";
import type { PatientFormEntry } from "../../../../types/form";

const draft: PatientFormEntry = {
    form_id: 1, name: "Wywiad", completed: false,
    layout: [{ columns: [{ field: { label: "Objaw", type: "text", required: true, value: "" } }] }],
};

test("validates draft and completed forms", () => {
    assert.doesNotThrow(() => validatePatientForm(draft));
    assert.throws(() => validatePatientForm({ ...draft, completed: true }));
});

test("visit creation, search, pagination and isolated form updates", { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
    try {
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
    } finally {
        await sql.end();
    }
});
