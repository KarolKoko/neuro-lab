import React, { useEffect, useState } from "react";
import { styled } from "styled-components";
import { useData } from "vike-react/useData";
import { onSaveForm, onUpdateForm } from "./formCreator.telefunc";
import type { Data } from "./+data";
import columnsA from "../../assets/columns-1.svg";
import columnsB from "../../assets/columns-2.svg";
import columnsC from "../../assets/columns-3.svg";
import headingIcon from "../../assets/heading.svg";
import backIcon from '../../assets/arrow-back.svg'
import { type FieldPosition, FormRow, PreviewModalProps, FormField, FieldType } from '../../types/form'

const FormLayoutButton = styled.button`
    padding: 30px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background-color: #ffffffa2;
    border: 1px solid #000;
    cursor: pointer;
    border-radius: 5px;
    color: inherit;

    &:hover {
        background-color: #ffffff;
    }
`;

const LayoutOptions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 24px 0;
`;

const FormNameInput = styled.input`
    min-width: min(100%, 280px);
    padding: 12px;
    border: 1px solid #9aa9b8;
    border-radius: 5px;
    font: inherit;
`;

const Canvas = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
`;

const RowInserter = styled.div`
    display: flex;
    justify-content: center;
    gap: 8px;
    opacity: 0.45;
    transition: opacity 0.15s ease-in-out;

    &:hover,
    &:focus-within {
        opacity: 1;
    }
`;

const InsertButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 32px;
    border: 1px solid #4b647a;
    border-radius: 5px;
    background: #ffffffd9;
    color: #244056;
    cursor: pointer;

    &:hover {
        background: #ffffff;
        border-color: #244056;
    }
`;

const RowContainer = styled.div`
    position: relative;
    padding-top: 34px;
`;

const RemoveRowButton = styled.button`
    position: absolute;
    top: 0;
    right: 0;
    padding: 6px 10px;
    border: 1px solid #9b2c2c;
    border-radius: 5px;
    background: #ffffff;
    color: #9b2c2c;
    cursor: pointer;

    &:hover {
        background: #9b2c2c;
        color: #ffffff;
    }
`;

export const FormRowView = styled.div<{ $columnCount: number }>`
    display: grid;
    grid-template-columns: repeat(${({ $columnCount }) => $columnCount}, minmax(0, 1fr));
    gap: 16px;

    @media (max-width: 700px) {
        grid-template-columns: 1fr;
    }
`;

const EmptyBox = styled.div`
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed #9aa9b8;
    border-radius: 8px;
    background: #ffffff80;
`;

const AddFieldButton = styled.button`
    width: 48px;
    height: 48px;
    border: 1px solid #4b647a;
    border-radius: 50%;
    background: #ffffff;
    color: #244056;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
`;

const FieldBox = styled.button`
    min-height: 120px;
    padding: 16px;
    text-align: left;
    border: 1px solid #9aa9b8;
    border-radius: 8px;
    background: #ffffffd9;
    color: #244056;
    cursor: pointer;

    &:hover {
        border-color: #244056;
    }
`;

const ModalBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: #17263599;
`;

const Modal = styled.form`
    width: min(100%, 440px);
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 12px 40px #17263555;
`;

export const FieldLabel = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #244056;
    font-weight: 600;
`;

const TextInput = styled.input`
    padding: 10px;
    border: 1px solid #9aa9b8;
    border-radius: 5px;
    font: inherit;
`;

const SelectInput = styled.select`
    padding: 10px;
    border: 1px solid #9aa9b8;
    border-radius: 5px;
    font: inherit;
`;

const ModalActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
    padding: 10px 16px;
    border: 1px solid #244056;
    border-radius: 5px;
    background: ${({ $primary }) => ($primary ? "#244056" : "#ffffff")};
    color: ${({ $primary }) => ($primary ? "#ffffff" : "#244056")};
    cursor: pointer;
`;

const PreviewModalForm = styled.form`
    width: min(100%, 760px);
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 12px 40px #17263555;
`;

export const PreviewInput = styled.input`
    padding: 10px;
    border: 1px solid #9aa9b8;
    border-radius: 5px;
    font: inherit;
    font-weight: 400;
`;

const createRow = (columnCount: number): FormRow => ({
    columns: Array.from({ length: columnCount }, () => ({ field: null })),
});

type TitleTarget =
    | { kind: "edit"; rowIndex: number }
    | { kind: "insert"; index: number };

const insertRow = (rows: FormRow[], index: number, row: FormRow): FormRow[] => [
    ...rows.slice(0, index),
    row,
    ...rows.slice(index),
];

const createTitleRow = (label: string): FormRow => ({
    columns: [{ field: { type: "label", label, required: true } }],
});

export const SectionTitle = styled.h4`
    margin: 8px 0 0;
    padding-bottom: 6px;
    border-bottom: 2px solid #244056;
    color: #244056;
    font-size: 20px;
    font-weight: 700;
`;

const SectionTitleButton = styled.button`
    width: 100%;
    padding: 12px 16px;
    text-align: left;
    border: 1px dashed #4b647a;
    border-radius: 8px;
    background: #ffffffd9;
    color: #244056;
    font-size: 20px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
        border-color: #244056;
    }
`;

export const PreviewModal = (props: PreviewModalProps) => {
    return (
        <ModalBackdrop onMouseDown={() => props.setIsPreviewOpen(false)}>
            <PreviewModalForm
                onSubmit={(event) => event.preventDefault()}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <h3>{props.formName?.trim() || "Podgląd formularza"}</h3>
                {props.layout.map((row, rowIndex) => (
                    <FormRowView key={rowIndex} $columnCount={row.columns.length}>
                        {row.columns.map(({ field }, columnIndex) => {
                            if (!field) return <div key={columnIndex} />;
                            if (field.type === "label") {
                                return <SectionTitle key={columnIndex}>{field.label}</SectionTitle>;
                            }
                            const valueKey = `${rowIndex}-${columnIndex}`;
                            const inputType =
                                field.type === "attachment"
                                    ? "file"
                                    : field.type === "number"
                                        ? "number"
                                        : field.type == "text" ? "text":
                                        "checkbox";

                            return (
                                <FieldLabel key={columnIndex}>
                                    {field.label}{field.required ? " *" : ""}
                                    <PreviewInput
                                        type={inputType}
                                        required={field.required}
                                        value={
                                            inputType === "file"
                                                ? undefined
                                                : props.previewValues[valueKey] ?? ""
                                        }
                                        onChange={(event) =>
                                            props.setPreviewValues((previousValues) => ({
                                                ...previousValues,
                                                [valueKey]:
                                                    inputType === "file"
                                                        ? event.target.files?.[0]?.name ?? ""
                                                        : event.target.value,
                                            }))
                                        }
                                    />
                                </FieldLabel>
                            );
                        })}
                    </FormRowView>
                ))}
                <ModalActions>
                    <ActionButton
                        type="button"
                        onClick={() => props.setIsPreviewOpen(false)}
                    >
                        Zamknij
                    </ActionButton>
                </ModalActions>
            </PreviewModalForm>
        </ModalBackdrop>        
    )
}

const Page = () => {
    const { form } = useData<Data>();
    const [layout, setLayout] = useState<FormRow[]>(form?.layout ?? []);
    const [formName, setFormName] = useState(form?.name ?? "");
    const [activePosition, setActivePosition] = useState<FieldPosition | null>(null);
    const [titleTarget, setTitleTarget] = useState<TitleTarget | null>(null);
    const [titleDraft, setTitleDraft] = useState("");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
    const [saveError, setSaveError] = useState("");
    const [saveSuccess, setSaveSuccess] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [draft, setDraft] = useState<FormField>({
        label: "",
        type: "text",
        required: false,
    });

    useEffect(() => {
        if (!activePosition && !isPreviewOpen && titleTarget === null) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setActivePosition(null);
                setTitleTarget(null);
                setIsPreviewOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activePosition, isPreviewOpen, titleTarget]);

    const openTitleModal = (target: TitleTarget) => {
        setTitleDraft(
            target.kind === "edit"
                ? layout[target.rowIndex]?.columns[0]?.field?.label ?? ""
                : "",
        );
        setTitleTarget(target);
    };

    const saveTitle = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const label = titleDraft.trim();
        if (titleTarget === null || !label) return;

        setLayout((previousLayout) =>
            titleTarget.kind === "insert"
                ? insertRow(previousLayout, titleTarget.index, createTitleRow(label))
                : previousLayout.map((row, rowIndex) =>
                      rowIndex === titleTarget.rowIndex ? createTitleRow(label) : row,
                  ),
        );
        setTitleTarget(null);
    };

    const addBlock = (columnCount: number, index?: number) => {
        setLayout((previousLayout) =>
            insertRow(previousLayout, index ?? previousLayout.length, createRow(columnCount)),
        );
    };

    const openFieldModal = (rowIndex: number, columnIndex: number) => {
        const existingField = layout[rowIndex]?.columns[columnIndex]?.field;
        setDraft(existingField ?? { label: "", type: "text", required: false });
        setActivePosition({ rowIndex, columnIndex });
    };

    const saveField = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const label = draft.label.trim();
        if (!activePosition || !label) return;

        setLayout((previousLayout) =>
            previousLayout.map((row, rowIndex) =>
                rowIndex !== activePosition.rowIndex
                    ? row
                    : {
                          columns: row.columns.map((column, columnIndex) =>
                              columnIndex !== activePosition.columnIndex
                                  ? column
                                  : { field: { ...draft, label } },
                          ),
                      },
            ),
        );
        setActivePosition(null);
    };

    const saveForm = async () => {
        const name = formName.trim();
        if (!name) {
            setSaveError("Wpisz nazwę formularza.");
            return;
        }

        setIsSaving(true);
        setSaveError("");
        setSaveSuccess("");
        try {
            if (form) {
                await onUpdateForm({ formId: form.form_id, name, layout });
                setSaveSuccess("Formularz został zaktualizowany.");
            } else {
                await onSaveForm({ name, layout });
                setSaveSuccess("Formularz został zapisany.");
            }
            window.location.replace('/formTemplates')
        } catch (error) {
            console.error("Nie udało się zapisać formularza:", error);
            setSaveError("Nie udało się zapisać formularza. Spróbuj ponownie.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <a href="/formTemplates" className="inline-block">
                <button className="border mt-5 py-2 px-4 rounded flex items-center hover:border-blue-700 hover:text-black" style={{gap: "10px", cursor: "pointer"}}><img src={backIcon} alt="" /> Powrót do listy</button>
            </a>
            <h2 style={{
                fontSize: "30px",
                marginTop: "20px"
            }}>{form ? "Edytuj formularz" : "Stwórz formularz"}</h2>
            <p>
                Użyj siatki i bloków aby utworzyć układ. Następnie wybierz pola,
                które chcesz dodać do formularza.
            </p>
            <LayoutOptions>
                <FormNameInput
                    aria-label="Nazwa formularza"
                    placeholder="Nazwa formularza"
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                />
                <FormLayoutButton type="button" onClick={() => addBlock(1)}>
                    <img src={columnsA} alt="" />
                    1 kolumna
                </FormLayoutButton>
                <FormLayoutButton type="button" onClick={() => addBlock(2)}>
                    <img src={columnsB} alt="" />
                    2 kolumny
                </FormLayoutButton>
                <FormLayoutButton type="button" onClick={() => addBlock(3)}>
                    <img src={columnsC} alt="" />
                    3 kolumny
                </FormLayoutButton>
                <ActionButton
                    type="button"
                    onClick={() => openTitleModal({ kind: "insert", index: layout.length })}
                >
                    Tytuł sekcji
                </ActionButton>                
                <ActionButton type="button" onClick={saveForm} disabled={isSaving}>
                    {isSaving ? "Zapisywanie..." : form ? "Zapisz zmiany" : "Zapisz"}
                </ActionButton>
                <ActionButton
                    $primary
                    type="button"
                    onClick={() => {
                        setPreviewValues({});
                        setIsPreviewOpen(true);
                    }}
                >
                    Podgląd
                </ActionButton>
            </LayoutOptions>
            {saveError && <p role="alert">{saveError}</p>}
            {saveSuccess && <p role="status">{saveSuccess}</p>}

            <Canvas id="canvas">
                {layout.map((row, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                    <RowInserter role="group" aria-label={`Wstaw przed wierszem ${rowIndex + 1}`}>
                        {[
                            { columns: 1, icon: columnsA, label: "1 kolumna" },
                            { columns: 2, icon: columnsB, label: "2 kolumny" },
                            { columns: 3, icon: columnsC, label: "3 kolumny" },
                        ].map(({ columns, icon, label }) => (
                            <InsertButton
                                key={columns}
                                type="button"
                                title={label}
                                aria-label={`Wstaw ${label} przed wierszem ${rowIndex + 1}`}
                                onClick={() => addBlock(columns, rowIndex)}
                            >
                                <img src={icon} alt="" />
                            </InsertButton>
                        ))}
                        <InsertButton
                            type="button"
                            title="Tytuł sekcji"
                            aria-label={`Wstaw tytuł sekcji przed wierszem ${rowIndex + 1}`}
                            onClick={() => openTitleModal({ kind: "insert", index: rowIndex })}
                        >
                            <img src={headingIcon} alt="" />
                        </InsertButton>
                    </RowInserter>
                    <RowContainer>
                        <RemoveRowButton
                            type="button"
                            aria-label={`Usuń wiersz ${rowIndex + 1}`}
                            onClick={() => {
                                setLayout((previousLayout) =>
                                    previousLayout.filter((_, index) => index !== rowIndex),
                                );
                            }}
                        >
                            Usuń wiersz
                        </RemoveRowButton>
                        <FormRowView $columnCount={row.columns.length}>
                            {row.columns.map((column, columnIndex) => (
                                <EmptyBox key={columnIndex}>
                                    {column.field?.type === "label" ? (
                                        <SectionTitleButton
                                            type="button"
                                            aria-label={`Edytuj tytuł sekcji ${column.field.label}`}
                                            onClick={() => openTitleModal({ kind: "edit", rowIndex })}
                                        >
                                            {column.field.label}
                                        </SectionTitleButton>
                                    ) : column.field ? (
                                        <FieldBox
                                            type="button"
                                            onClick={() => openFieldModal(rowIndex, columnIndex)}
                                        >
                                            <strong>{column.field.label}</strong>
                                            <br />
                                            Typ: {column.field.type}
                                            <br />
                                            {column.field.required ? "Pole wymagane" : "Pole opcjonalne"}
                                        </FieldBox>
                                    ) : (
                                        <AddFieldButton
                                            type="button"
                                            aria-label={`Dodaj pole, wiersz ${rowIndex + 1}, kolumna ${columnIndex + 1}`}
                                            onClick={() => openFieldModal(rowIndex, columnIndex)}
                                        >
                                            +
                                        </AddFieldButton>
                                    )}
                                </EmptyBox>
                            ))}
                        </FormRowView>
                    </RowContainer>
                    </React.Fragment>
                ))}
            </Canvas>

            {activePosition && (
                <ModalBackdrop onMouseDown={() => setActivePosition(null)}>
                    <Modal
                        onSubmit={saveField}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <h3>{draft.label ? "Edytuj pole" : "Dodaj pole"}</h3>
                        <FieldLabel>
                            Etykieta
                            <TextInput
                                autoFocus
                                required
                                value={draft.label}
                                onChange={(event) =>
                                    setDraft((previousDraft) => ({
                                        ...previousDraft,
                                        label: event.target.value,
                                    }))
                                }
                            />
                        </FieldLabel>
                        <FieldLabel>
                            Typ
                            <SelectInput
                                value={draft.type}
                                onChange={(event) =>
                                    setDraft((previousDraft) => ({
                                        ...previousDraft,
                                        type: event.target.value as FieldType,
                                    }))
                                }
                            >
                                <option value="attachment">Załącznik</option>
                                <option value="text">Tekst</option>
                                <option value="number">Liczba</option>
                                <option value="checkbox">Tak/Nie</option>
                            </SelectInput>
                        </FieldLabel>
                        <FieldLabel>
                            <span>
                                <input
                                    type="checkbox"
                                    checked={draft.required}
                                    onChange={(event) =>
                                        setDraft((previousDraft) => ({
                                            ...previousDraft,
                                            required: event.target.checked,
                                        }))
                                    }
                                />{" "}
                                Pole wymagane
                            </span>
                        </FieldLabel>
                        <ModalActions>
                            <ActionButton
                                type="button"
                                onClick={() => setActivePosition(null)}
                            >
                                Anuluj
                            </ActionButton>
                            <ActionButton $primary type="submit">
                                Zapisz pole
                            </ActionButton>
                        </ModalActions>
                    </Modal>
                </ModalBackdrop>
            )}
            {titleTarget !== null && (
                <ModalBackdrop onMouseDown={() => setTitleTarget(null)}>
                    <Modal
                        onSubmit={saveTitle}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <h3>{titleTarget.kind === "insert" ? "Dodaj tytuł sekcji" : "Edytuj tytuł sekcji"}</h3>
                        <FieldLabel>
                            Tytuł sekcji
                            <TextInput
                                autoFocus
                                required
                                value={titleDraft}
                                onChange={(event) => setTitleDraft(event.target.value)}
                            />
                        </FieldLabel>
                        <ModalActions>
                            <ActionButton type="button" onClick={() => setTitleTarget(null)}>
                                Anuluj
                            </ActionButton>
                            <ActionButton $primary type="submit">
                                Zapisz tytuł
                            </ActionButton>
                        </ModalActions>
                    </Modal>
                </ModalBackdrop>
            )}
            {isPreviewOpen && (
                <PreviewModal
                    setIsPreviewOpen={setIsPreviewOpen}
                    formName={formName}
                    layout={layout}
                    setPreviewValues={setPreviewValues}
                    previewValues={previewValues}
                />
            )}
        </div>
    );
};

export default Page;