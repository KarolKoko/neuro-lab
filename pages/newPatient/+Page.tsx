import React, { useCallback, useState, useEffect } from 'react'
import { useData } from 'vike-react/useData';
import type { Data } from "./+data";
import NewPatientForm from './NewPatientForm';
import { onPatientInit, onUpdatePatient } from './newPatient.telefunc';
import { navigate } from 'vike/client/router';
import ErrorDialog from '../../components/ErrorDialog';
import type { FormRow, PatientFormEntry } from '../../types/form';

type FormLayout = { columns: { field: { label: string; type: string } | null }[] }[];

type PatientInitData = {
    unq: string,
    date: string,
    time: string
}

// Zwraca etykiety wszystkich pól (z pominięciem pustych kolumn i tytułów sekcji)
const getFieldLabels = (layout: FormLayout): string[] =>
    layout.flatMap((row) =>
        row.columns.flatMap(({ field }) =>
            field && field.type !== "label" ? [field.label] : [],
        ),
    );

const hasAllRequiredFields = (layout: FormRow[]): boolean =>
    layout.every((row) =>
        row.columns.every(({ field }) => {
            if (!field?.required || field.type === "label") return true;
            const value = field.value?.trim() ?? "";
            return field.type === "checkbox" ? value === "true" : value.length > 0;
        }),
    );

const Page = () => {

    const [ClientDatePicker, setClientDatePicker] = useState<any>(null);

    useEffect(() => {
        // Dynamiczny import ładuje komponent tylko w przeglądarce
        import('../../components/DatePicker').then((mod) => {
            setClientDatePicker(() => mod.default);
        });
    }, []);

    const { formsListInit } = useData<Data>();
    const [forms, setForms] = useState(() => Array.from(formsListInit)); 
    const [selectedForms, setSelectedForms] = useState<number[]>([])
    const [ creationModalOpen, setCreationModalOpen ] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [createdPatient, setCreatedPatient] = useState<{ patientId: number; forms: PatientFormEntry[] } | null>(null)
    const [currentPreviewForm, setCurrentPreviewForm] = useState<number | null>(null)
    const [finishing, setFinishing] = useState(false)
    const [ patientInitData, setPatientInitData ] = useState<PatientInitData>({
        unq: "",
        date: "",
        time: ""
    })

    const toggleSelectedForm = (id:number) => {
        setSelectedForms(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
    }

    const updateCreatedPatientForms = useCallback((updatedForms: PatientFormEntry[]) => {
        setCreatedPatient((previous) =>
            previous ? { ...previous, forms: updatedForms } : previous,
        )
    }, [])

    const startCreation = async () => {
        // Patient was already created in this session - just reopen its (autosaved) form
        if (createdPatient) {
            setCreationModalOpen(true)
            return
        }

        const entries: PatientFormEntry[] = selectedForms.flatMap((id) => {
            const form = forms.find((f) => f.form_id === id)
            return form ? [{ form_id: form.form_id, name: form.name, layout: form.layout as FormRow[] }] : []
        })
        if (entries.length === 0) {
            setErrorMessage("Wybierz formularz, który chcesz wypełnić.")
            return
        }

        try {
            const result = await onPatientInit({
                patient_unq: patientInitData.unq,
                date: patientInitData.date,
                time: patientInitData.time,
                forms: entries,
            })
            if (!result.ok) {
                setErrorMessage(result.message)
                return
            }
            setCreatedPatient({ patientId: result.patientId, forms: entries })
            setCreationModalOpen(true)
        } catch (err) {
            console.error("Nie udało się rozpocząć tworzenia pacjenta:", err);
            setErrorMessage(
                err instanceof Error && err.message
                    ? err.message
                    : "Nie udało się rozpocząć tworzenia pacjenta. Spróbuj ponownie.",
            );
        }
    }

    const finishCreation = async () => {
        if (!createdPatient || finishing) return;
        setFinishing(true);
        try {
            await onUpdatePatient({ patientId: createdPatient.patientId, formFilled: createdPatient.forms });
            await navigate("/patients");
        } catch (err) {
            console.error("Nie udało się zakończyć tworzenia pacjenta:", err);
            setErrorMessage(err instanceof Error && err.message ? err.message : "Nie udało się zapisać pacjenta. Spróbuj ponownie.");
        } finally {
            setFinishing(false);
        }
    };

    // Saved as DD-MM-YYYY (the format accepted by isValidDate)
    const setVisitDate = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0")
        const formatted = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`
        setPatientInitData((prev) => ({ ...prev, date: formatted }))
    }

    return (
        <div>
            <h2 style={{
                fontSize: "30px",
                marginTop: "20px",
                marginBottom: "20px"
            }}>Nowy pacjent</h2>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]'>
                <div className="min-w-0">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="patient_unq_id">
                        Unikalny identyfikator pacjenta *
                    </label>
                    <input onChange={(e) => setPatientInitData((prev) => {
                        return {
                            ...prev,
                            unq: e.target.value
                        }
                    })} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="patient_unq_id" type="text" placeholder="Maciej Kowalski"></input>
                    <p className="text-gray-500 text-xs italic">Wpisz PESEL, albo imię i naziwsko - użyj unikalnej frazy</p>
                </div>
                <div className='min-w-0 border p-3 rounded'>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="patient_visit_date">
                        Data wizyty *
                    </label>                    
                    {ClientDatePicker ? <ClientDatePicker onDateChange={setVisitDate} /> : <p>Ładowanie kalendarza...</p>}
                </div>
                <div className='min-w-0 border p-3 rounded'>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="patient_visit_time">
                        Godzina
                    </label>                                        
                    <input
                        type="time"
                        id="patient_visit_time"
                        className="w-full min-w-0"
                        step={1}
                        value={patientInitData.time}
                        onChange={(event) => {
                            const inputTime = event.target.value;
                            setPatientInitData((previous) => ({
                                ...previous,
                                time: inputTime
                                    ? inputTime.length === 5
                                        ? `${inputTime}:00`
                                        : inputTime
                                    : "",
                            }));
                        }}
                    />
                </div>
                {patientInitData.date && patientInitData.time && patientInitData.unq && selectedForms.length > 0 && <button onClick={() => startCreation()} className='min-h-11 rounded border px-4 py-3 text-sm font-semibold sm:col-span-2 lg:col-span-3' style={{cursor: "pointer"}}>Przejdź do wypełniania formularza</button>}
            </div>
            <h3 style={{fontSize: "20px", marginTop: "20px"}}>Z jakich/jakiego formularza/y skorzystasz?</h3>
            <div className='mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {forms.map(f => {
                    return (
                        <div key={f.form_id} className='relative min-w-0 break-words rounded border p-3 pb-12' onClick={() => {
                            if(!(createdPatient?.forms.some(
                                    (entry) =>
                                        entry.form_id === f.form_id &&
                                        entry.completed === true &&
                                        hasAllRequiredFields(entry.layout),
                                ))){
                                    toggleSelectedForm(f.form_id)
                                }
                        }}>
                            <input type="checkbox" className='mr-5' checked={selectedForms.includes(f.form_id)} onChange={() => {}} /> <b>{f.name}</b>
                            <p>{getFieldLabels(f.layout).join(", ").length > 100 ? `${getFieldLabels(f.layout).join(", ").slice(0, 100)}...` : getFieldLabels(f.layout).join(", ")}</p>
                            {createdPatient?.forms.some(
                                    (entry) =>
                                        entry.form_id === f.form_id &&
                                        entry.completed === true &&
                                        hasAllRequiredFields(entry.layout),
                                ) && (
                                    <>
                                        <span
                                            role="status"
                                            className="absolute bottom-3 right-3 font-semibold text-green-700"
                                        >
                                            Wypełnione
                                        </span>
                                        <button onClick={(event) => {
                                            event.stopPropagation()
                                            setCurrentPreviewForm(f.form_id)
                                            setCreationModalOpen(true)
                                        }} style={{cursor: "pointer"}} className="absolute bottom-2 left-2 font-semibold rounded border p-1">Podgląd</button>
                                    </>
                                )}
                        </div>
                    )
                })}
            </div>
            <div className='mt-4'>
                <button type="button" onClick={finishCreation} disabled={!createdPatient || finishing} className='rounded border p-3 disabled:opacity-50'>Zakończ</button>
            </div>
            {creationModalOpen && createdPatient && (
                <NewPatientForm
                    key={currentPreviewForm ?? "editing"}
                    patientId={createdPatient.patientId}
                    forms={currentPreviewForm !== null ? createdPatient.forms.filter(f => f.form_id === currentPreviewForm) : createdPatient.forms}
                    readOnly={currentPreviewForm !== null}
                    onFormsChange={updateCreatedPatientForms}
                    onClose={() => {
                        setCreationModalOpen(false)
                        setCurrentPreviewForm(null)
                    }}
                />
            )}
            {errorMessage && <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />}
        </div>
    )
}

export default Page
