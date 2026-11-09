import React, { useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";
import printerIcon from "../../assets/printer.svg";
import editIcon from "../../assets/edit.svg";
import previewIcon from "../../assets/eye.svg";
import { PreviewModal } from "../formCreator/+Page";
import { onDeleteForm } from "../formCreator/formCreator.telefunc";
import addIcon from '../../assets/plus.svg'
import { PrintableForm } from "../../components/PrintableForm";

type FormRow = {
    columns: {
        field: {
            label: string;
            type: "attachment" | "text" | "number" | "checkbox" | "label";
            required: boolean;
        } | null;
    }[];
};

type FormBoxProps = {
    formId: number;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    layout: FormRow[];
    isDeleting: boolean;
    onDelete: (formId: number, title: string) => void;
    onPrint: (formId: number) => void;
};

const FormBox = ({
    formId,
    title,
    createdAt,
    updatedAt,
    layout,
    isDeleting,
    onDelete,
    onPrint,
}: FormBoxProps) => {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

    const openPreview = () => {
        setPreviewValues({});
        setIsPreviewOpen(true);
    };

    return (
        <>
            <article className="overflow-hidden rounded-lg bg-white shadow-lg">
                <div className="px-6 py-5">
                    <h2 className="mb-2 truncate text-xl font-bold" title={title}>
                        {title}
                    </h2>
                    <p className="text-sm text-gray-700">
                        Ostatnia modyfikacja: {updatedAt.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                        Utworzono: {createdAt.toLocaleDateString()}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 px-6 pb-5">
                    <button
                        type="button"
                        onClick={() => onPrint(formId)}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold"
                    >
                        <img className="h-4 w-4" src={printerIcon} alt="" />
                        Drukuj
                    </button>
                    <a
                        href={`/formCreator?formId=${formId}`}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold border hover:border-blue-700 hover:text-black"
                    >
                        <img className="h-4 w-4" src={editIcon} alt="" />
                        Edytuj
                    </a>
                    <button
                        type="button"
                        onClick={openPreview}
                        aria-label={`Podgląd formularza ${title}`}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold border"
                    >
                        <img className="h-4 w-4" src={previewIcon} alt="" />
                        Podgląd
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(formId, title)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting ? "Usuwanie..." : "Usuń"}
                    </button>
                </div>
            </article>
            {isPreviewOpen && (
                <PreviewModal
                    setIsPreviewOpen={setIsPreviewOpen}
                    formName={title}
                    layout={layout}
                    setPreviewValues={setPreviewValues}
                    previewValues={previewValues}
                />
            )}
        </>
    );
};

const Page = () => {
    const { formsListInit } = useData<Data>();
    const [forms, setForms] = useState(() => Array.from(formsListInit));
    const [deleteError, setDeleteError] = useState("");
    const [deletingFormId, setDeletingFormId] = useState<number | null>(null);
    const [printingFormId, setPrintingFormId] = useState<number | null>(null);

    useEffect(() => {
        if (printingFormId === null) return;

        document.body.classList.add("printing-form");
        const handleAfterPrint = () => setPrintingFormId(null);
        window.addEventListener("afterprint", handleAfterPrint);
        const frame = window.requestAnimationFrame(() => window.print());

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("afterprint", handleAfterPrint);
            document.body.classList.remove("printing-form");
        };
    }, [printingFormId]);

    const deleteForm = async (formId: number, title: string) => {
        if (!window.confirm(`Czy na pewno chcesz usunąć formularz „${title}”?`)) {
            return;
        }

        setDeletingFormId(formId);
        setDeleteError("");
        try {
            await onDeleteForm({ formId });
            setForms((previousForms) =>
                previousForms.filter((form) => form.form_id !== formId),
            );
        } catch (error) {
            console.error("Nie udało się usunąć formularza:", error);
            setDeleteError("Nie udało się usunąć formularza. Spróbuj ponownie.");
        } finally {
            setDeletingFormId(null);
        }
    };

    return (
        <main className="mx-auto max-w-7xl p-6">
            <header className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Szablony formularzy</h1>
                    <p className="mt-2 text-gray-600">
                        Przeglądaj zapisane formularze lub otwórz ich podgląd.
                    </p>                    
                </div>
                <a href="/formCreator">
                    <button className="border py-2 px-4 rounded flex items-center hover:border-blue-700 hover:text-black" style={{gap: "10px", cursor: "pointer"}}>Stwórz nowy <img src={addIcon} alt="" /></button>
                </a>
            </header>
            {deleteError && <p role="alert" className="mb-4 text-red-700">{deleteError}</p>}
            {forms.length > 0 ? (
                <section
                    aria-label="Lista szablonów formularzy"
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {forms.map((form, index) => (
                        <FormBox
                            key={form.form_id ?? `${form.name}-${form.created_at.toISOString()}-${index}`}
                            formId={form.form_id}
                            title={form.name}
                            createdAt={form.created_at}
                            updatedAt={form.updated_at}
                            layout={form.layout}
                            isDeleting={deletingFormId === form.form_id}
                            onDelete={deleteForm}
                            onPrint={setPrintingFormId}
                        />
                    ))}
                </section>
            ) : (
                <p role="status" className="rounded-lg bg-white p-6 text-gray-600 shadow">
                    Nie ma jeszcze zapisanych formularzy.
                </p>
            )}
            {forms.map((form) =>
                form.form_id === printingFormId ? (
                    <PrintableForm
                        key={form.form_id}
                        title={form.name}
                        layout={form.layout}
                    />
                ) : null,
            )}
        </main>
    );
};

export default Page;
