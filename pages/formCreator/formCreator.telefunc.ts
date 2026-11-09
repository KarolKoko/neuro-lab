import { getContext } from "telefunc";
import * as pgQueries from "../../database/postgres/queries/forms";

type FormField = {
    label: string;
    type: "attachment" | "text" | "number" | "checkbox" | "label";
    required: boolean;
};

type FormLayout = {
    columns: { field: FormField | null }[];
}[];

export async function onSaveForm({
    name,
    layout,
}: {
    name: string;
    layout: FormLayout;
}) {
    const context = getContext();
    if (!context.user) {
        throw new Error("Użytkownik musi być zalogowany, aby zapisać formularz.");
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
        throw new Error("Nazwa formularza jest wymagana.");
    }
    if (!Array.isArray(layout)) {
        throw new Error("Układ formularza jest nieprawidłowy.");
    }

    await pgQueries.insertForm(context.db, trimmedName, layout);
}

export async function onUpdateForm({
    formId,
    name,
    layout,
}: {
    formId: number;
    name: string;
    layout: FormLayout;
}) {
    const context = getContext();
    if (!context.user) {
        throw new Error("Użytkownik musi być zalogowany, aby edytować formularz.");
    }
    if (!Number.isSafeInteger(formId) || formId < 1) {
        throw new Error("Identyfikator formularza jest nieprawidłowy.");
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
        throw new Error("Nazwa formularza jest wymagana.");
    }
    if (!Array.isArray(layout)) {
        throw new Error("Układ formularza jest nieprawidłowy.");
    }

    const updatedForms = await pgQueries.updateFormById(
        context.db,
        formId,
        trimmedName,
        layout,
    );
    if (updatedForms.length === 0) {
        throw new Error("Nie znaleziono formularza do edycji.");
    }
}

export async function onDeleteForm({ formId }: { formId: number }) {
    const context = getContext();
    if (!context.user) {
        throw new Error("Użytkownik musi być zalogowany, aby usunąć formularz.");
    }
    if (!Number.isSafeInteger(formId) || formId < 1) {
        throw new Error("Identyfikator formularza jest nieprawidłowy.");
    }

    const deletedForms = await pgQueries.deleteFormById(context.db, formId);
    if (deletedForms.length === 0) {
        throw new Error("Nie znaleziono formularza do usunięcia.");
    }
}
