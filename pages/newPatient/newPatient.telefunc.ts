import { getContext } from "telefunc";
import * as pgQueries from "../../database/postgres/queries/patient";
import { isValidDate, isValidTime } from "../../server/validation";
import type { PatientFormEntry } from "../../types/form";

export async function onPatientInit({
    patient_unq,
    date,
    time,
    forms,
}: {
    patient_unq: string;
    date: string;
    time: string;
    forms: PatientFormEntry[];
}) {
    const context = getContext();
    if (!context.user) {
        throw new Error("Użytkownik musi być zalogowany, aby zapisać formularz.");
    }

    const trimmed_patient_unq = patient_unq.trim();
    if (!trimmed_patient_unq) {
        throw new Error("Identyfikator pacjenta jest wymagany.");
    }
    if (!isValidDate(date)) {
        throw new Error("Data w prawidłowym formacie jest wymagana.");
    }
    if (!isValidTime(time)) {
        throw new Error("Godzina wizyty w prawidłowym formacie jest wymagana.");
    }
    if (!Array.isArray(forms) || forms.length === 0) {
        throw new Error("Układ formularza jest nieprawidłowy.");
    }

    try {
        const [patient] = await pgQueries.insertPatient(
            context.db,
            trimmed_patient_unq,
            forms,
            date,
            time,
        );
        return { ok: true as const, patientId: patient.patient_id as number };
    } catch (err) {
        // 23505 = unique_violation (patient_unq_id_unique); returned instead of thrown so the message survives telefunc in production
        if ((err as { code?: string }).code === "23505") {
            return {
                ok: false as const,
                message: `Pacjent o identyfikatorze „${trimmed_patient_unq}” już istnieje. Użyj innego, unikalnego identyfikatora.`,
            };
        }
        throw err;
    }
}

export async function onUpdatePatient({
    patientId,
    formFilled,
}: {
    patientId: number;
    formFilled: PatientFormEntry[];
}) {
    const context = getContext();
    if (!context.user) {
        throw new Error("Użytkownik musi być zalogowany, aby edytować formularz.");
    }
    if (!Number.isSafeInteger(patientId) || patientId < 1) {
        throw new Error("Identyfikator pacjenta jest nieprawidłowy.");
    }
    if (!Array.isArray(formFilled)) {
        throw new Error("Układ formularza jest nieprawidłowy.");
    }

    const updatedForms = await pgQueries.updatePatientForms(
        context.db,
        patientId,
        formFilled
    );
    if (updatedForms.length === 0) {
        throw new Error("Nie znaleziono pacjenta do edycji.");
    }
}
