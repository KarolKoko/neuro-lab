import React, { useState } from "react";
import { onTrashPatient } from "../pages/patients/trash.telefunc";

export function TrashPatientButton({ patientId, identifier, onTrashed }: {
    patientId: number;
    identifier: string;
    onTrashed: () => void;
}) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    const moveToTrash = async () => {
        if (!window.confirm(`Przenieść pacjenta „${identifier}” do kosza?`)) return;
        setPending(true);
        setError("");
        try {
            await onTrashPatient({ patientId });
            onTrashed();
        } catch (err) {
            console.error("Nie udało się przenieść pacjenta do kosza:", err);
            setError("Nie udało się przenieść pacjenta do kosza. Odśwież stronę i spróbuj ponownie.");
        } finally {
            setPending(false);
        }
    };

    return (
        <div>
            <button type="button" disabled={pending} onClick={moveToTrash}
                className="min-h-11 rounded border border-red-700 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
                {pending ? "Przenoszenie..." : "Do kosza"}
                <span className="sr-only"> pacjenta {identifier}</span>
            </button>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
    );
}
