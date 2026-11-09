import React, { useCallback, useRef, useState } from "react";
import { useData } from "vike-react/useData";
import ErrorDialog from "../../../../../components/ErrorDialog";
import type { PatientFormEntry } from "../../../../../types/form";
import NewPatientForm from "../../../../newPatient/NewPatientForm";
import { onCreateVisit, onSaveVisitForm } from "../visits.telefunc";
import type { Data } from "./+data";

export default function Page() {
    const { patientId, patientIdentifier, forms } = useData<Data>();
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [selected, setSelected] = useState<number[]>([]);
    const [visit, setVisit] = useState<{ visitId: number; forms: PatientFormEntry[] } | null>(null);
    const savedForms = useRef(new Map<number, string>());
    const creatingRef = useRef(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const saveForms = useCallback(async (updated: PatientFormEntry[]) => {
        if (!visit) throw new Error("Nie utworzono wizyty.");
        for (const form of updated) {
            const snapshot = JSON.stringify(form);
            if (savedForms.current.get(form.form_id) === snapshot) continue;
            await onSaveVisitForm({ patientId, visitId: visit.visitId, form });
            savedForms.current.set(form.form_id, snapshot);
        }
    }, [patientId, visit]);
    const visitUrl = visit ? `/patient/${patientId}/visits/${visit.visitId}` : `/patient/${patientId}/visits`;

    const start = async () => {
        if (creatingRef.current || visit) return;
        if (!date || !time || !selected.length) {
            setError("Wybierz datę, godzinę i co najmniej jeden formularz.");
            return;
        }
        creatingRef.current = true;
        setCreating(true);
        try {
            const result = await onCreateVisit({ patientId, date, time: time.length === 5 ? `${time}:00` : time, formIds: selected });
            savedForms.current = new Map(result.forms.map((form) => [form.form_id, JSON.stringify(form)]));
            setVisit(result);
        } catch (err) {
            console.error("Nie udało się utworzyć wizyty:", err);
            setError("Nie udało się utworzyć wizyty. Sprawdź dane i spróbuj ponownie.");
        } finally {
            creatingRef.current = false;
            setCreating(false);
        }
    };

    return (
        <main className="my-6 rounded-xl bg-white p-5 shadow">
            <a className="underline" href={`/patient/${patientId}/visits`}>← Rejestr wizyt</a>
            <h1 className="mt-4 text-3xl font-semibold">Nowa wizyta</h1>
            <div className="mt-5 flex flex-wrap items-end gap-4">
                <label className="min-w-0 max-w-full font-semibold">Unikalny identyfikator pacjenta
                    <input className="mt-1 block max-w-full rounded border bg-gray-100 px-3 py-2 font-normal" value={patientIdentifier} readOnly />
                </label>
                <label className="min-w-0 max-w-full font-semibold">Data wizyty *
                    <input type="date" className="mt-1 block max-w-full rounded border px-3 py-2 font-normal" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <label className="min-w-0 max-w-full font-semibold">Godzina wizyty *
                    <input type="time" step="1" className="mt-1 block max-w-full rounded border px-3 py-2 font-normal" value={time} onChange={(event) => setTime(event.target.value)} />
                </label>
            </div>
            <h2 className="my-5 text-xl font-semibold">Wybierz formularze</h2>
            {forms.length === 0 && <p>Brak dostępnych formularzy. Najpierw utwórz formularz.</p>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                    <label key={form.formId} className="min-w-0 rounded border p-4 [overflow-wrap:anywhere]">
                        <input type="checkbox" className="mr-3" checked={selected.includes(form.formId)} onChange={(event) => setSelected((previous) =>
                            event.target.checked ? [...previous, form.formId] : previous.filter((id) => id !== form.formId)
                        )} />
                        {form.name}
                    </label>
                ))}
            </div>
            <button type="button" disabled={creating || forms.length === 0} onClick={start} className="mt-5 rounded bg-sky-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
                {creating ? "Tworzenie wizyty..." : "Przejdź do wypełniania formularzy"}
            </button>
            {visit && (
                <NewPatientForm patientId={patientId} forms={visit.forms} onSave={saveForms}
                    onFinish={() => { window.location.assign(visitUrl); }}
                    onClose={() => { window.location.assign(visitUrl); }} />
            )}
            {error && <ErrorDialog message={error} onClose={() => setError(null)} />}
        </main>
    );
}
