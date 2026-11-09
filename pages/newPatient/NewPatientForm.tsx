import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PatientFormEntry } from '../../types/form'
import { FieldLabel, FormRowView, PreviewInput, SectionTitle } from '../formCreator/+Page';
import {styled} from 'styled-components';
import closeIcon from '../../assets/x.svg'
import ErrorDialog from '../../components/ErrorDialog';
import { onUpdatePatient } from './newPatient.telefunc';
import { navigate } from 'vike/client/router';

const AUTOSAVE_DELAY_MS = 800;

type NewPatientFormProps = {
    patientId: number;
    forms: PatientFormEntry[];
    readOnly?: boolean;
    onFormsChange?: (forms: PatientFormEntry[]) => void;
    saveOnFinishOnly?: boolean;
    allowDraftSave?: boolean;
    onSave?: (forms: PatientFormEntry[]) => Promise<void>;
    onFinish?: (forms: PatientFormEntry[]) => void;
    onClose: () => void;
};

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
    idle: "",
    pending: "Zmiany niezapisane...",
    saving: "Zapisywanie...",
    saved: "Zapisano",
    error: "Błąd zapisu",
};

const FullSizeDialog = styled.div`
    width: 100%;
    height: 100vh;
    height: 100dvh;
    background-color: #fff;
    position: fixed;
    z-index: 40;
    top: 0;
    left: 0;
    overflow-y: auto;
    padding: clamp(20px, 6vw, 100px);
`

const NewPatientForm = ({
    patientId,
    forms,
    readOnly = false,
    onFormsChange,
    saveOnFinishOnly = false,
    allowDraftSave = false,
    onSave,
    onFinish,
    onClose,
}: NewPatientFormProps) => {
    const [entries, setEntries] = useState<PatientFormEntry[]>(forms);
    // Order in which forms are shown: the chosen one first, then the rest
    const [queue, setQueue] = useState<number[] | null>(
        forms.length === 1 ? [0] : null,
    );
    const [queuePosition, setQueuePosition] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]);
    const [advancing, setAdvancing] = useState(false);

    const latestEntries = useRef(entries);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasPendingChanges = useRef(false);
    const advancingRef = useRef(false);
    // Saves are chained so an older request can never overwrite a newer one
    const saveQueue = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        if (!readOnly) onFormsChange?.(entries);
    }, [entries, onFormsChange, readOnly]);

    const save = useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        if (!hasPendingChanges.current) return saveQueue.current;

        hasPendingChanges.current = false;
        const snapshot = latestEntries.current;
        setSaveStatus("saving");
        saveQueue.current = saveQueue.current.then(async () => {
            try {
                if (onSave) {
                    await onSave(snapshot);
                } else {
                    await onUpdatePatient({ patientId, formFilled: snapshot });
                }
                setSaveStatus(hasPendingChanges.current ? "pending" : "saved");
            } catch (err) {
                console.error("Nie udało się zapisać formularza pacjenta:", err);
                hasPendingChanges.current = true;
                setSaveStatus("error");
                setErrorMessage(
                    err instanceof Error && err.message
                        ? err.message
                        : "Nie udało się zapisać zmian. Spróbuj ponownie.",
                );
            }
        });
        return saveQueue.current;
    }, [patientId, onSave]);

    const updateValue = (
        entryIndex: number,
        rowIndex: number,
        columnIndex: number,
        value: string,
    ) => {
        setMissingRequiredFields([]);
        const nextEntries = latestEntries.current.map((entry, currentEntry) =>
                currentEntry !== entryIndex
                    ? entry
                    : {
                          ...entry,
                          completed: false,
                          layout: entry.layout.map((row, currentRow) =>
                              currentRow !== rowIndex
                                  ? row
                                  : {
                                        columns: row.columns.map((column, currentColumn) =>
                                            currentColumn !== columnIndex || !column.field
                                                ? column
                                                : { field: { ...column.field, value } },
                                        ),
                                    },
                          ),
                      },
        );
        latestEntries.current = nextEntries;
        setEntries(nextEntries);

        hasPendingChanges.current = true;
        setSaveStatus("pending");
        if (timer.current) clearTimeout(timer.current);
        if (!saveOnFinishOnly) timer.current = setTimeout(save, AUTOSAVE_DELAY_MS);
    };

    // Flush unsaved changes when the component unmounts
    useEffect(() => () => {
        if (!saveOnFinishOnly) void save();
    }, [save, saveOnFinishOnly]);

    const startFilling = () => {
        setQueue([
            startIndex,
            ...entries.map((_, index) => index).filter((index) => index !== startIndex),
        ]);
        setQueuePosition(0);
    };

    const closeForm = async () => {
        if (saveOnFinishOnly) {
            onClose();
            return;
        }
        await save();
        if (!hasPendingChanges.current) onClose();
    };

    const saveDraft = async () => {
        if (advancingRef.current || !onFinish) return;
        advancingRef.current = true;
        setAdvancing(true);
        try {
            const draftEntries = latestEntries.current.map((entry) => ({ ...entry, completed: false }));
            latestEntries.current = draftEntries;
            setEntries(draftEntries);
            hasPendingChanges.current = true;
            await save();
            if (!hasPendingChanges.current) onFinish(draftEntries);
        } finally {
            advancingRef.current = false;
            setAdvancing(false);
        }
    };

    const goNext = async () => {
        if (!queue || advancingRef.current) return;

        const entryIndex = queue[queuePosition];
        const currentEntry = entries[entryIndex];
        const missingFields = currentEntry.layout.flatMap((row) =>
            row.columns.flatMap(({ field }) => {
                if (!field?.required || field.type === "label") return [];
                const value = field.value?.trim() ?? "";
                const isMissing =
                    field.type === "checkbox" ? value !== "true" : value.length === 0;
                return isMissing ? [field.label] : [];
            }),
        );

        if (missingFields.length > 0) {
            setMissingRequiredFields(missingFields);
            return;
        }

        advancingRef.current = true;
        setAdvancing(true);
        try {
            setMissingRequiredFields([]);
            const completedEntries = latestEntries.current.map((entry, index) =>
                index === entryIndex ? { ...entry, completed: true } : entry,
            );
            latestEntries.current = completedEntries;
            setEntries(completedEntries);
            hasPendingChanges.current = true;
            await save();
            if (hasPendingChanges.current) return;

            if (queuePosition + 1 < queue.length) {
                setQueuePosition(queuePosition + 1);
            } else {
                if (onFinish) {
                    onFinish(completedEntries);
                } else {
                    await navigate("/patients");
                }
            }
        } catch (error) {
            console.error("Nie udało się przejść do listy pacjentów:", error);
            setErrorMessage("Nie udało się przejść do listy pacjentów. Spróbuj ponownie.");
        } finally {
            advancingRef.current = false;
            setAdvancing(false);
        }
    };

    if (queue === null) {
        return (
            <FullSizeDialog>
                <div className='flex justify-end p-2'>
                    <button onClick={onClose} className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"><img src={closeIcon} alt="Zamknij okno formularza" /></button>
                </div>
                <div className='mx-auto mt-10 max-w-md rounded border p-6 shadow'>
                    <label htmlFor="start-form-select" className="mb-2 block text-sm font-bold text-gray-700">
                        Który formularz chcesz wypełnić jako pierwszy?
                    </label>
                    <select
                        id="start-form-select"
                        className="mb-4 w-full rounded border px-3 py-2"
                        value={startIndex}
                        onChange={(event) => setStartIndex(Number(event.target.value))}
                    >
                        {entries.map((entry, index) => (
                            <option key={entry.form_id} value={index}>{entry.name}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={startFilling}
                        className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        Rozpocznij
                    </button>
                </div>
            </FullSizeDialog>
        );
    }

    const entryIndex = queue[queuePosition];
    const entry = entries[entryIndex];
    const isLast = queuePosition + 1 >= queue.length;

    return (
        <>
            <FullSizeDialog>
                <div className='flex items-start justify-between gap-3 p-2'>
                    <span role="status" className="min-w-0 text-sm text-gray-600 [overflow-wrap:anywhere]">
                        {readOnly ? "Podgląd: " : queue.length > 1 && `Formularz ${queuePosition + 1} z ${queue.length}: `}
                        <b>{entry.name}</b> {!readOnly && SAVE_STATUS_LABELS[saveStatus] && `— ${SAVE_STATUS_LABELS[saveStatus]}`}
                    </span>
                    <button onClick={closeForm} disabled={advancing} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"><img src={closeIcon} alt="Zamknij okno formularza" /></button>
                </div>
                {saveOnFinishOnly && <p className="px-2 text-sm text-gray-600">Zmiany są zapisywane po kliknięciu przycisku zapisu. Zamknięcie anuluje zmiany.</p>}
                {
                    entry.layout.map((row, rowIndex) => (
                        <FormRowView key={rowIndex} $columnCount={row.columns.length}>
                            {row.columns.map(({ field }, columnIndex) => {
                                if (!field) return <div key={columnIndex} />;
                                if (field.type === "label") {
                                    return <SectionTitle key={columnIndex}>{field.label}</SectionTitle>;
                                }
                                const inputType =
                                    field.type === "attachment"
                                        ? "file"
                                        : field.type === "number"
                                            ? "number"
                                            : field.type == "text" ? "text" :
                                                "checkbox";

                                return (
                                    <FieldLabel key={columnIndex}>
                                        {field.label}{field.required ? " *" : ""}
                                        {inputType === "file" && field.value && !readOnly && <span className="text-sm">Obecny plik: {field.value}</span>}
                                        {readOnly ? (
                                            <PreviewInput
                                                type={inputType === "checkbox" ? "checkbox" : "text"}
                                                {...(inputType === "checkbox"
                                                    ? { checked: field.value === "true", disabled: true }
                                                    : { value: field.value ?? "", readOnly: true })}
                                            />
                                        ) : (
                                            <PreviewInput
                                                type={inputType}
                                                disabled={advancing}
                                                required={field.required}
                                                {...(inputType === "checkbox"
                                                    ? { checked: field.value === "true" }
                                                    : inputType === "file"
                                                        ? {}
                                                        : { value: field.value ?? "" })}
                                                onChange={(event) =>
                                                    updateValue(
                                                        entryIndex,
                                                        rowIndex,
                                                        columnIndex,
                                                        inputType === "file"
                                                            ? event.target.files?.[0]?.name ?? ""
                                                            : inputType === "checkbox"
                                                                ? String(event.target.checked)
                                                                : event.target.value,
                                                    )
                                                }
                                            />
                                        )}
                                    </FieldLabel>
                                );
                            })}
                        </FormRowView>
                    ))
                }
                {!readOnly && missingRequiredFields.length > 0 && (
                    <div role="alert" className="mx-4 mb-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                        <p className="m-0 font-semibold">Uzupełnij wymagane pola przed przejściem dalej:</p>
                        <ul className="mb-0 mt-1 list-inside list-disc">
                            {missingRequiredFields.map((label, index) => (
                                <li key={`${label}-${index}`}>{label}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {!readOnly && (
                    <div className='flex flex-wrap justify-end gap-3 p-4'>
                        {allowDraftSave && (
                            <button type="button" onClick={saveDraft} disabled={advancing} className="min-h-11 rounded border px-5 py-2 text-sm font-semibold disabled:opacity-50">
                                Zapisz wersję roboczą
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={goNext}
                            disabled={advancing}
                            className="min-h-11 cursor-pointer rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        > 
                            {isLast ? (saveOnFinishOnly ? "Zapisz" : "Zakończ") : "Dalej"}
                        </button>
                    </div>
                )}
            </FullSizeDialog>
            {errorMessage && <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />}
        </>
    )
}

export default NewPatientForm
