import { getContext } from "telefunc";
import { getPatientsList } from "../../database/postgres/queries/patient";
import { filtersFromInput, matchingFields } from "./filters";

export async function onSearchPatients({ terms, date }: { terms: string[]; date: string }) {
    const context = getContext();
    if (!context.user) throw new Error("Użytkownik musi być zalogowany, aby wyszukiwać pacjentów.");
    if (!Array.isArray(terms) || !terms.every((term) => typeof term === "string") || typeof date !== "string") {
        throw new Error("Nieprawidłowe dane wyszukiwania.");
    }
    const filters = filtersFromInput(terms, date);
    if (filters.terms.length === 0 && !date) return { results: [], total: 0 };
    const { patients, total } = await getPatientsList(context.db, filters, 1);
    return {
        results: patients.map((patient) => ({
            patientId: patient.patient_id,
            identifier: patient.patient_unq_id,
            matches: matchingFields(patient, filters.terms),
        })),
        total,
    };
}
