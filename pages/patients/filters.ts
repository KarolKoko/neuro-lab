import { isValidDate } from "../../server/validation";
import type { PatientFilters, PatientListItem } from "../../database/postgres/queries/patient";
import type { PatientFormEntry } from "../../types/form";

export function parseVisitDate(value: string): string | null {
    if (!value) return "";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const date = `${match[3]}-${match[2]}-${match[1]}`;
    return isValidDate(date) ? date : null;
}

export function matchingFields(patient: PatientListItem, terms: string[]) {
    return matchingFormFields([
        ...(Array.isArray(patient.start_forms) ? patient.start_forms : []),
        ...(Array.isArray(patient.visit_forms) ? patient.visit_forms : []),
    ], terms);
}

export function matchingFormFields(forms: PatientFormEntry[], terms: string[]) {
    const phrases = terms.map((term) => term.trim().toLowerCase()).filter(Boolean);
    if (!Array.isArray(forms)) return [];
    return forms.flatMap((form) =>
        Array.isArray(form.layout) ? form.layout.flatMap((row) =>
            Array.isArray(row.columns) ? row.columns.flatMap(({ field }) =>
                field && field.type !== "label" && typeof field.value === "string" &&
                phrases.some((term) => (field.value ?? "").toLowerCase().includes(term))
                    ? [{ label: field.label, value: field.value }]
                    : [],
            ) : [],
        ) : [],
    );
}

export function filtersFromInput(terms: string[], date: string, patientId?: number): PatientFilters {
    const visitDate = parseVisitDate(date);
    if (visitDate === null) throw new Error("Nieprawidłowa data wizyty.");
    if (patientId !== undefined && (!Number.isSafeInteger(patientId) || patientId < 1 || patientId > 2147483647)) {
        throw new Error("Nieprawidłowy identyfikator pacjenta.");
    }
    return { terms: terms.map((term) => term.trim()).filter(Boolean), visitDate, patientId };
}
