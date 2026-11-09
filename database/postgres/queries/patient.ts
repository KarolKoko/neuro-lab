import type postgres from "postgres";
import type { PatientFormEntry } from "../../../types/form";

export function insertPatient(sql: postgres.Sql, patient_unq: string, start_forms: PatientFormEntry[], first_visit_date: string, first_visit_time: string) {
    return sql`INSERT INTO patient (start_forms, patient_unq_id, first_visit_date, first_visit_time) VALUES (${sql.json(start_forms as any)}, ${patient_unq}, ${first_visit_date}, ${first_visit_time}) RETURNING patient_id`;
}

// export function getFormById(sql: postgres.Sql, formId: number) {
//     return sql`SELECT * FROM forms WHERE form_id = ${formId}`;
// }

export function updatePatientForms(
    sql: postgres.Sql,
    patientId: number,
    start_forms: PatientFormEntry[]
) {
    return sql`
        UPDATE patient
        SET start_forms = ${sql.json(start_forms as any)}
        WHERE patient_id = ${patientId} AND NOT is_deleted
        RETURNING patient_id
    `;
}

export function getPatient(sql: postgres.Sql, patientId : number) {
    return sql<PatientListItem[]>`
        SELECT patient_id, patient_unq_id, first_visit_date, start_forms
        FROM patient WHERE patient_id = ${patientId} AND NOT is_deleted`;
}

export function updatePatientForm(sql: postgres.Sql, patientId: number, form: PatientFormEntry) {
    return sql`
        UPDATE patient p
        SET start_forms = (
            SELECT jsonb_agg(
                CASE WHEN entry->>'form_id' = ${String(form.form_id)}
                    THEN ${sql.json(form)}::jsonb ELSE entry END
                ORDER BY position
            )
            FROM jsonb_array_elements(p.start_forms) WITH ORDINALITY AS forms(entry, position)
        )
        WHERE p.patient_id = ${patientId}
          AND NOT p.is_deleted
          AND jsonb_typeof(p.start_forms) = 'array'
          AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(
                  CASE WHEN jsonb_typeof(p.start_forms) = 'array' THEN p.start_forms ELSE '[]'::jsonb END
              ) AS forms(entry)
              WHERE entry->>'form_id' = ${String(form.form_id)}
          )
        RETURNING p.patient_id`;
}

export function setPatientDeleted(sql: postgres.Sql, patientId: number, isDeleted: boolean) {
    return sql<{ patient_id: number }[]>`
        UPDATE patient SET is_deleted = ${isDeleted}
        WHERE patient_id = ${patientId} AND is_deleted = ${!isDeleted}
        RETURNING patient_id`;
}

export async function getDeletedPatients(sql: postgres.Sql) {
    const patients = await sql<{ patient_id: number; patient_unq_id: string }[]>`
        SELECT patient_id, patient_unq_id FROM patient
        WHERE is_deleted
        ORDER BY patient_unq_id, patient_id`;
    return Array.from(patients);
}

export const PATIENTS_PAGE_SIZE = 100;

export type PatientListItem = {
    patient_id: number;
    patient_unq_id: string;
    first_visit_date: string | null;
    last_visit_date?: string | null;
    start_forms: PatientFormEntry[];
    visit_forms?: PatientFormEntry[];
};

export type PatientFilters = {
    terms: string[];
    visitDate: string;
    patientId?: number;
};

function lastVisitDate(sql: postgres.Sql) {
    return sql`COALESCE(
        (SELECT to_char(max(v.date), 'DD-MM-YYYY') FROM visits v WHERE v.patient_id = p.patient_id),
        p.first_visit_date
    )`;
}

export async function getRecentPatients(sql: postgres.Sql) {
    const patients = await sql<{
        patient_id: number;
        patient_unq_id: string;
        last_visit_date: string | null;
    }[]>`
        SELECT recent.patient_id, recent.patient_unq_id, recent.last_visit_date
        FROM (
            SELECT p.patient_id, p.patient_unq_id, ${lastVisitDate(sql)} AS last_visit_date
            FROM patient p
            WHERE NOT p.is_deleted
        ) AS recent
        ORDER BY
            CASE WHEN recent.last_visit_date ~ '^[0-9]{2}-[0-9]{2}-[0-9]{4}$'
                THEN substring(recent.last_visit_date FROM 7 FOR 4)
                    || substring(recent.last_visit_date FROM 4 FOR 2)
                    || substring(recent.last_visit_date FROM 1 FOR 2)
            END DESC NULLS LAST,
            recent.patient_id DESC
        LIMIT 5`;
    return Array.from(patients);
}

export async function getPatientsList(sql: postgres.Sql, filters: PatientFilters, page: number) {
    const terms = filters.terms.map((term) => term.trim()).filter(Boolean);
    const filter = sql`
        NOT p.is_deleted
        AND (${filters.patientId ?? null}::integer IS NULL OR p.patient_id = ${filters.patientId ?? null})
        AND (${filters.visitDate} = '' OR ${lastVisitDate(sql)} = ${filters.visitDate})
        AND (
            cardinality(${sql.array(terms, 25)}::text[]) = 0
            OR EXISTS (
                SELECT 1
                FROM unnest(${sql.array(terms, 25)}::text[]) AS search(term)
                WHERE strpos(lower(p.patient_unq_id), lower(search.term)) > 0
                   OR strpos(p.patient_id::text, search.term) > 0
                   OR EXISTS (
                       SELECT 1
                       FROM (
                           SELECT p.start_forms AS entries
                           UNION ALL
                           SELECT v.forms_data FROM visits v WHERE v.patient_id = p.patient_id
                       ) AS source
                       CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(source.entries) = 'array' THEN source.entries ELSE '[]'::jsonb END) AS form(entry)
                       CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(form.entry->'layout') = 'array' THEN form.entry->'layout' ELSE '[]'::jsonb END) AS row(entry)
                       CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(row.entry->'columns') = 'array' THEN row.entry->'columns' ELSE '[]'::jsonb END) AS col(entry)
                       WHERE col.entry->'field'->>'type' <> 'label'
                         AND strpos(lower(col.entry->'field'->>'value'), lower(search.term)) > 0
                   )
            )
        )`;
    const [{ total }] = await sql<{ total: number }[]>`
        SELECT count(*)::integer AS total FROM patient p WHERE ${filter}`;
    const patients = await sql<PatientListItem[]>`
        SELECT p.patient_id, p.patient_unq_id, p.first_visit_date, p.start_forms,
            ${lastVisitDate(sql)} AS last_visit_date,
            COALESCE((
                SELECT jsonb_agg(form.entry ORDER BY v.date DESC, v.time DESC, v.id DESC, form.position)
                FROM visits v
                CROSS JOIN LATERAL jsonb_array_elements(
                    CASE WHEN jsonb_typeof(v.forms_data) = 'array' THEN v.forms_data ELSE '[]'::jsonb END
                ) WITH ORDINALITY AS form(entry, position)
                WHERE v.patient_id = p.patient_id
            ), '[]'::jsonb) AS visit_forms
        FROM patient p WHERE ${filter}
        ORDER BY p.patient_unq_id ASC, p.patient_id ASC
        LIMIT ${PATIENTS_PAGE_SIZE} OFFSET ${(page - 1) * PATIENTS_PAGE_SIZE}`;
    return { patients: Array.from(patients), total };
}