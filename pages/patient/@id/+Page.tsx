import React, { useCallback, useState } from "react";
import { useData } from "vike-react/useData";
import type { PatientFormEntry } from "../../../types/form";
import NewPatientForm from "../../newPatient/NewPatientForm";
import type { Data } from "./+data";
import { PatientFormCards } from "../../../components/PatientFormCards";
import { onSavePatientForm } from "./patient.telefunc";
import { TrashPatientButton } from "../../../components/TrashPatientButton";

export default function Page() {
    const { patient } = useData<Data>();
    return <PatientDetails key={patient.patient_id} patient={patient} />;
}

function PatientDetails({ patient }: Data) {
    const [forms, setForms] = useState(patient.start_forms);
    const [editingFormId, setEditingFormId] = useState<number | null>(null);
    const editingForm = forms.find((form) => form.form_id === editingFormId);

    const saveForm = useCallback(async (entries: PatientFormEntry[]) => {
        if (entries.length !== 1) throw new Error("Nieprawidłowa liczba formularzy do zapisu.");
        await onSavePatientForm({ patientId: patient.patient_id, form: entries[0] });
    }, [patient.patient_id]);

    return (
        <main className="my-6 rounded-xl bg-white p-5 shadow">
            <a href="/patients" className="text-sm font-semibold text-sky-800 underline">← Lista pacjentów</a>
            <h1 className="mb-1 mt-4 text-3xl font-semibold [overflow-wrap:anywhere]">Pacjent: {patient.patient_unq_id}</h1>
            <p className="mb-6 text-sm text-gray-600">ID: {patient.patient_id}</p>
            <div className="mb-6 flex flex-wrap gap-3">
                <a className="rounded bg-sky-800 px-4 py-2 font-semibold text-white" href={`/patient/${patient.patient_id}/visits/new`}>Wizyta</a>
                <a className="rounded border px-4 py-2 font-semibold" href={`/patient/${patient.patient_id}/visits`}>Rejestr wizyt</a>
                <TrashPatientButton patientId={patient.patient_id} identifier={patient.patient_unq_id} onTrashed={() => window.location.assign("/patients")} />
            </div>
            <h2 className="mb-4 text-xl font-semibold">Formularze pacjenta</h2>
            <PatientFormCards forms={forms} onEdit={setEditingFormId} previewUrl={(id) => `/patient/${patient.patient_id}/form/${id}`} />
            {editingForm && (
                <NewPatientForm
                    key={editingForm.form_id}
                    patientId={patient.patient_id}
                    forms={[editingForm]}
                    saveOnFinishOnly
                    allowDraftSave={editingForm.completed !== true}
                    onSave={saveForm}
                    onFinish={([updated]) => {
                        setForms((previous) => previous.map((form) => form.form_id === updated.form_id ? updated : form));
                        setEditingFormId(null);
                    }}
                    onClose={() => setEditingFormId(null)}
                />
            )}
        </main>
    );
}
