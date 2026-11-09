import React, { useCallback, useState } from "react";
import { useData } from "vike-react/useData";
import { PatientFormCards } from "../../../../../components/PatientFormCards";
import type { PatientFormEntry } from "../../../../../types/form";
import NewPatientForm from "../../../../newPatient/NewPatientForm";
import { onSaveVisitForm } from "../visits.telefunc";
import type { Data } from "./+data";

export default function Page() {
    const data = useData<Data>();
    return <VisitDetails key={data.visit.id} {...data} />;
}

function VisitDetails({ patientId, patientIdentifier, visit }: Data) {
    const [forms, setForms] = useState(visit.forms_data);
    const [editingId, setEditingId] = useState<number | null>(null);
    const editingForm = forms.find((form) => form.form_id === editingId);
    const base = `/patient/${patientId}/visits/${visit.id}`;
    const save = useCallback(async (entries: PatientFormEntry[]) => {
        if (entries.length !== 1) throw new Error("Nieprawidłowa liczba formularzy.");
        await onSaveVisitForm({ patientId, visitId: visit.id, form: entries[0] });
    }, [patientId, visit.id]);
    return (
        <main className="my-6 rounded-xl bg-white p-5 shadow">
            <a className="underline" href={`/patient/${patientId}/visits`}>← Rejestr wizyt</a>
            <h1 className="mt-4 text-3xl font-semibold [overflow-wrap:anywhere]">Wizyta: {patientIdentifier}</h1>
            <p>{visit.date.split("-").reverse().join("-")} {visit.time}</p>
            <h2 className="my-5 text-xl font-semibold">Formularze wizyty</h2>
            <PatientFormCards forms={forms} onEdit={setEditingId} previewUrl={(id) => `${base}/form/${id}`} />
            {editingForm && (
                <NewPatientForm patientId={patientId} key={editingForm.form_id} forms={[editingForm]}
                    saveOnFinishOnly allowDraftSave={editingForm.completed !== true} onSave={save}
                    onFinish={([updated]) => {
                        setForms((previous) => previous.map((form) => form.form_id === updated.form_id ? updated : form));
                        setEditingId(null);
                    }} onClose={() => setEditingId(null)} />
            )}
        </main>
    );
}
