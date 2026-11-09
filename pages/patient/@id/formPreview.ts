import type { PatientFormEntry } from "../../../types/form";

export function getFormPreview(form: PatientFormEntry) {
    return form.layout.flatMap((row) =>
        row.columns.flatMap(({ field }) => {
            if (!field || field.type === "label" || !field.value?.trim()) return [];
            const value = field.type === "checkbox"
                ? (field.value === "true" ? "Tak" : "Nie")
                : field.value;
            return [{ label: field.label, value }];
        }),
    ).slice(0, 5);
}
