import { getContext } from "telefunc";
import { getForms } from "../../../../database/postgres/queries/forms";
import { createVisit, getVisits, updateVisitForm } from "../../../../database/postgres/queries/visits";
import { getPatient } from "../../../../database/postgres/queries/patient";
import { parseVisitDate, matchingFormFields } from "../../../patients/filters";
import { isValidTime } from "../../../../server/validation";
import { validatePatientForm } from "../../../../server/patient-form-validation";
import type { FormRow, PatientFormEntry } from "../../../../types/form";

function validId(id: number) {
    return Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
}

function contextForPatient(patientId: number) {
    const context = getContext();
    if (!context.user) throw new Error("Użytkownik musi być zalogowany.");
    if (!validId(patientId)) throw new Error("Nieprawidłowy identyfikator pacjenta.");
    return context;
}

export async function onCreateVisit({ patientId, date, time, formIds }: {
    patientId: number; date: string; time: string; formIds: number[];
}) {
    const context = contextForPatient(patientId);
    if (typeof date !== "string" || !date || parseVisitDate(date) === null ||
        typeof time !== "string" || !isValidTime(time) ||
        !Array.isArray(formIds) || formIds.length === 0 || !formIds.every(validId) ||
        new Set(formIds).size !== formIds.length) {
        throw new Error("Wybierz formularze oraz prawidłową datę i godzinę wizyty.");
    }
    if (!(await getPatient(context.db, patientId)).length) throw new Error("Nie znaleziono pacjenta.");
    const available = await getForms(context.db);
    const forms: PatientFormEntry[] = formIds.map((id) => {
        const form = available.find((item) => item.form_id === id);
        if (!form) throw new Error("Nie znaleziono wybranego formularza.");
        return { form_id: id, name: form.name, layout: form.layout as FormRow[], completed: false };
    });
    const [visit] = await createVisit(context.db, patientId, date, time, forms);
    return { visitId: visit.id, forms };
}

export async function onSaveVisitForm({ patientId, visitId, form }: {
    patientId: number; visitId: number; form: PatientFormEntry;
}) {
    const context = contextForPatient(patientId);
    if (!validId(visitId)) throw new Error("Nieprawidłowy identyfikator wizyty.");
    validatePatientForm(form);
    if ((await updateVisitForm(context.db, patientId, visitId, form)).length === 0) throw new Error("Nie znaleziono formularza wizyty.");
}

export async function onSearchVisits({ patientId, terms, date }: { patientId: number; terms: string[]; date: string }) {
    const context = contextForPatient(patientId);
    if (!Array.isArray(terms) || !terms.every((term) => typeof term === "string") ||
        typeof date !== "string" || parseVisitDate(date) === null) throw new Error("Nieprawidłowe dane wyszukiwania.");
    const phrases = terms.map((term) => term.trim()).filter(Boolean);
    if (!phrases.length && !date) return { results: [], total: 0 };
    const { visits, total } = await getVisits(context.db, patientId, { terms: phrases, date }, 1);
    return { total, results: visits.map((visit) => ({
        id: visit.id, date: visit.date, time: visit.time,
        names: visit.forms_data.map((form) => form.name),
        matches: matchingFormFields(visit.forms_data, phrases),
    })) };
}
