import type { PatientFormEntry } from "../types/form";

export function validatePatientForm(form: PatientFormEntry) {
    if (!form || !Number.isSafeInteger(form.form_id) || form.form_id < 1 ||
        typeof form.name !== "string" || typeof form.completed !== "boolean" || !Array.isArray(form.layout)) {
        throw new Error("Nieprawidłowe dane formularza pacjenta.");
    }
    for (const row of form.layout) {
        if (!row || !Array.isArray(row.columns)) throw new Error("Nieprawidłowy układ formularza.");
        for (const column of row.columns) {
            if (!column || !("field" in column)) throw new Error("Nieprawidłowe pole formularza.");
            const field = column.field;
            if (field === null) continue;
            if (!field || typeof field.label !== "string" || typeof field.required !== "boolean" ||
                !["attachment", "text", "number", "checkbox", "label"].includes(field.type) ||
                (field.value !== undefined && typeof field.value !== "string")) {
                throw new Error("Nieprawidłowe pole formularza.");
            }
            if (form.completed && field.required && field.type !== "label" &&
                (field.type === "checkbox" ? field.value !== "true" : !field.value?.trim())) {
                throw new Error("Uzupełnij wymagane pola formularza.");
            }
        }
    }
}
