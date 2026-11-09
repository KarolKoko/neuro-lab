import React from "react";
import type { PatientFormEntry } from "../types/form";
import { getFormPreview } from "../pages/patient/@id/formPreview";

export function PatientFormCards({ forms, onEdit, previewUrl }: {
    forms: PatientFormEntry[];
    onEdit: (formId: number) => void;
    previewUrl: (formId: number) => string;
}) {
    if (forms.length === 0) return <p>Brak przypisanych formularzy.</p>;
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => {
                const preview = getFormPreview(form);
                return (
                    <article key={form.form_id} className="flex flex-col rounded-lg border border-sky-200 bg-sky-50 p-4">
                        <h3 className="mb-3 break-words text-lg font-semibold">{form.name}</h3>
                        <p className="mb-3 text-sm font-semibold">{form.completed === true ? "Ukończony" : "Nieukończony"}</p>
                        {preview.length ? (
                            <dl className="flex-1 space-y-2">
                                {preview.map((field, index) => (
                                    <div key={index} className="break-words text-sm">
                                        <dt className="font-semibold">{field.label}</dt><dd>{field.value}</dd>
                                    </div>
                                ))}
                            </dl>
                        ) : <p className="flex-1 text-sm text-gray-600">Brak zapisanych wartości pól.</p>}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" className="rounded bg-sky-800 px-4 py-2 text-sm font-semibold text-white" onClick={() => onEdit(form.form_id)}>
                                {form.completed === true ? "Edytuj" : "Uzupełnij"} <span className="sr-only">formularz {form.name}</span>
                            </button>
                            <a className="rounded border border-sky-800 px-4 py-2 text-sm font-semibold" href={previewUrl(form.form_id)}>
                                Podgląd <span className="sr-only">formularza {form.name}</span>
                            </a>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
