import { getContext } from "telefunc";
import { setPatientDeleted } from "../../database/postgres/queries/patient";

async function changePatientStatus(patientId: number, isDeleted: boolean) {
    const context = getContext();
    if (!context.user) throw new Error("Użytkownik musi być zalogowany.");
    if (!Number.isSafeInteger(patientId) || patientId < 1 || patientId > 2147483647) {
        throw new Error("Nieprawidłowy identyfikator pacjenta.");
    }
    if (!(await setPatientDeleted(context.db, patientId, isDeleted)).length) {
        throw new Error("Nie znaleziono pacjenta o oczekiwanym statusie.");
    }
}

export async function onTrashPatient({ patientId }: { patientId: number }) {
    await changePatientStatus(patientId, true);
}

export async function onRestorePatient({ patientId }: { patientId: number }) {
    await changePatientStatus(patientId, false);
}
