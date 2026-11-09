import type postgres from "postgres";

type FormField = {
    label: string;
    type: "attachment" | "text" | "number" | "checkbox" | "label";
    required: boolean;
};

type FormLayout = {
    columns: { field: FormField | null }[];
}[];

export function insertForm(sql: postgres.Sql, name: string, layout: FormLayout) {
    return sql`INSERT INTO forms (name, layout) VALUES (${name}, ${sql.json(layout)})`;
}

export function getFormById(sql: postgres.Sql, formId: number) {
    return sql`SELECT * FROM forms WHERE form_id = ${formId}`;
}

export function updateFormById(
    sql: postgres.Sql,
    formId: number,
    name: string,
    layout: FormLayout,
) {
    return sql`
        UPDATE forms
        SET name = ${name}, layout = ${sql.json(layout)}
        WHERE form_id = ${formId}
        RETURNING form_id
    `;
}

export function deleteFormById(sql: postgres.Sql, formId: number) {
    return sql`DELETE FROM forms WHERE form_id = ${formId} RETURNING form_id`;
}

export function getForms(sql: postgres.Sql) {
    return sql`SELECT * FROM forms ORDER BY updated_at DESC`;
}
