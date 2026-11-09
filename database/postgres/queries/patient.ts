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
        WHERE patient_id = ${patientId}
        RETURNING patient_id
    `;
}

export function getPatient(sql: postgres.Sql, patientId : number) {
    return sql`SELECT * FROM patient WHERE patient_id = ${patientId}`;
}

export function getPatientsList(sql: postgres.Sql, page : number) {
    const LIMIT = 100
    return sql`SELECT * FROM patient ORDER BY patient_unq_id ASC LIMIT ${LIMIT} OFFSET ${page*LIMIT};`
}