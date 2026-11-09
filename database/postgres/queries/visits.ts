import type postgres from "postgres";
import type { PatientFormEntry } from "../../../types/form";

export type Visit = {
    id: number;
    patient_id: number;
    date: string;
    time: string;
    forms_data: PatientFormEntry[];
};

export type VisitFilters = { terms: string[]; date: string };
export const VISITS_PAGE_SIZE = 100;

export function createVisit(sql: postgres.Sql, patientId: number, date: string, time: string, forms: PatientFormEntry[]) {
    return sql<{ id: number }[]>`
        INSERT INTO visits (patient_id, date, time, forms_data)
        SELECT p.patient_id, ${date}::date, ${time}::time, ${sql.json(forms)}
        FROM patient p WHERE p.patient_id = ${patientId} AND NOT p.is_deleted
        RETURNING id`;
}

export function getVisit(sql: postgres.Sql, patientId: number, visitId: number) {
    return sql<Visit[]>`
        SELECT id, patient_id, to_char(date, 'YYYY-MM-DD') AS date,
               to_char(time, 'HH24:MI:SS') AS time, forms_data
        FROM visits v WHERE v.patient_id = ${patientId} AND v.id = ${visitId}
        AND EXISTS (SELECT 1 FROM patient p WHERE p.patient_id = v.patient_id AND NOT p.is_deleted)`;
}

export function updateVisitForm(sql: postgres.Sql, patientId: number, visitId: number, form: PatientFormEntry) {
    return sql`
        UPDATE visits v SET forms_data = (
            SELECT jsonb_agg(CASE WHEN entry->>'form_id' = ${String(form.form_id)}
                THEN ${sql.json(form)}::jsonb ELSE entry END ORDER BY position)
            FROM jsonb_array_elements(v.forms_data) WITH ORDINALITY AS forms(entry, position)
        )
        WHERE v.patient_id = ${patientId} AND v.id = ${visitId}
          AND EXISTS (SELECT 1 FROM patient p WHERE p.patient_id = v.patient_id AND NOT p.is_deleted)
          AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(
                  CASE WHEN jsonb_typeof(v.forms_data) = 'array' THEN v.forms_data ELSE '[]'::jsonb END
              ) AS forms(entry)
              WHERE entry->>'form_id' = ${String(form.form_id)}
          )
        RETURNING id`;
}

export async function getVisits(sql: postgres.Sql, patientId: number, filters: VisitFilters, page: number) {
    const terms = filters.terms.map((term) => term.trim()).filter(Boolean);
    const where = sql`
        v.patient_id = ${patientId}
        AND EXISTS (SELECT 1 FROM patient p WHERE p.patient_id = v.patient_id AND NOT p.is_deleted)
        AND (${filters.date} = '' OR v.date = NULLIF(${filters.date}, '')::date)
        AND (cardinality(${sql.array(terms, 25)}::text[]) = 0 OR EXISTS (
            SELECT 1 FROM unnest(${sql.array(terms, 25)}::text[]) AS search(term)
            WHERE strpos(v.id::text, search.term) > 0 OR EXISTS (
                SELECT 1 FROM jsonb_array_elements(
                    CASE WHEN jsonb_typeof(v.forms_data) = 'array' THEN v.forms_data ELSE '[]'::jsonb END
                ) AS forms(entry)
                WHERE strpos(lower(forms.entry->>'name'), lower(search.term)) > 0 OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements(
                        CASE WHEN jsonb_typeof(forms.entry->'layout') = 'array' THEN forms.entry->'layout' ELSE '[]'::jsonb END
                    ) AS rows(entry)
                    CROSS JOIN LATERAL jsonb_array_elements(
                        CASE WHEN jsonb_typeof(rows.entry->'columns') = 'array' THEN rows.entry->'columns' ELSE '[]'::jsonb END
                    ) AS columns(entry)
                    WHERE columns.entry->'field'->>'type' <> 'label'
                      AND strpos(lower(columns.entry->'field'->>'value'), lower(search.term)) > 0
                )
            )
        ))`;
    const [{ total }] = await sql<{ total: number }[]>`SELECT count(*)::integer AS total FROM visits v WHERE ${where}`;
    const visits = await sql<Visit[]>`
        SELECT v.id, v.patient_id, to_char(v.date, 'YYYY-MM-DD') AS date,
               to_char(v.time, 'HH24:MI:SS') AS time, v.forms_data
        FROM visits v WHERE ${where}
        ORDER BY v.date DESC, v.time DESC, v.id DESC
        LIMIT ${VISITS_PAGE_SIZE} OFFSET ${(page - 1) * VISITS_PAGE_SIZE}`;
    return { visits: Array.from(visits), total };
}
