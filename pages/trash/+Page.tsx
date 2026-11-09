import React, { useState } from "react";
import { useData } from "vike-react/useData";
import { onRestorePatient } from "../patients/trash.telefunc";
import type { Data } from "./+data";

export default function Page() {
    const data = useData<Data>();
    const [patients, setPatients] = useState(data.patients);
    const [restoringId, setRestoringId] = useState<number | null>(null);
    const [error, setError] = useState("");

    const restore = async (patientId: number) => {
        setRestoringId(patientId);
        setError("");
        try {
            await onRestorePatient({ patientId });
            setPatients((previous) => previous.filter((patient) => patient.patient_id !== patientId));
        } catch (err) {
            console.error("Nie udało się przywrócić pacjenta:", err);
            setError("Nie udało się przywrócić pacjenta. Odśwież stronę i spróbuj ponownie.");
        } finally {
            setRestoringId(null);
        }
    };

    return (
        <main className="my-6 rounded-xl bg-white p-5 shadow">
            <h1 className="text-3xl font-semibold">Kosz</h1>
            <p className="text-gray-600">Pacjentów z kosza można przywrócić wraz z ich formularzami i wizytami.</p>
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead><tr className="border-b">
                        <th scope="col" className="p-3">Identyfikator pacjenta</th>
                        <th scope="col" className="p-3">Akcje</th>
                    </tr></thead>
                    <tbody>
                        {patients.map((patient) => (
                            <tr key={patient.patient_id} className="border-b">
                                <td className="p-3 [overflow-wrap:anywhere]">{patient.patient_unq_id} <span className="text-sm text-gray-600">(ID: {patient.patient_id})</span></td>
                                <td className="p-3">
                                    <button type="button" disabled={restoringId !== null} onClick={() => restore(patient.patient_id)}
                                        className="min-h-11 rounded border px-4 py-2 font-semibold disabled:opacity-50">
                                        {restoringId === patient.patient_id ? "Przywracanie..." : "Przywróć"}
                                        <span className="sr-only"> pacjenta {patient.patient_unq_id}</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {patients.length === 0 && <tr><td colSpan={2} className="p-3">Kosz jest pusty.</td></tr>}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
