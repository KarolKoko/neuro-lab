import { getContext } from "telefunc";
import { updatePatientForm } from "../../../database/postgres/queries/patient";
import type { PatientFormEntry } from "../../../types/form";
import { validatePatientForm } from "../../../server/patient-form-validation";

export async function onSavePatientForm({ patientId, form }: { patientId: number; form: PatientFormEntry }) {
    const context = getContext();
    if (!context.user) throw new Error("Użytkownik musi być zalogowany, aby edytować formularz.");
    if (!Number.isSafeInteger(patientId) || patientId < 1 || patientId > 2147483647) throw new Error("Nieprawidłowy identyfikator pacjenta.");
    validatePatientForm(form);

    const updated = await updatePatientForm(context.db, patientId, form);
    if (updated.length === 0) throw new Error("Nie znaleziono formularza pacjenta.");
}
