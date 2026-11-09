import React from "react";
import type { FormRow } from "../types/form";

type Props = {
    title: string;
    layout: FormRow[];
    showValues?: boolean;
};

export function PrintableForm({ title, layout, showValues = false }: Props) {
    return (
        <section className={showValues ? "form-document form-document-preview" : "form-document printable-form"} aria-hidden={showValues ? undefined : true}>
            <h1 className="print-title">{title}</h1>
            <div className="print-layout">
                {layout.map((row, rowIndex) => (
                    <div className="print-row" style={{ gridTemplateColumns: `repeat(${row.columns.length}, minmax(0, 1fr))` }} key={rowIndex}>
                        {row.columns.map(({ field }, columnIndex) => {
                            const needsWritingLines = !showValues && field?.type !== "checkbox" && field?.type !== "label" && (field?.label.length ?? 0) > 50;
                            return (
                                <div className="print-cell" key={columnIndex}>
                                    {field?.type === "label" ? (
                                        <h2 className="print-section-title"><span className="print-checkbox" aria-hidden="true" />{field.label}</h2>
                                    ) : field ? (
                                        <div className={`print-field${needsWritingLines ? " print-long-field" : ""}`}>
                                            {field.type === "checkbox" && (
                                                <span className="print-checkbox" aria-label={showValues ? (field.value === "true" ? "Zaznaczono" : "Niezaznaczono") : undefined}>
                                                    {showValues && field.value === "true" ? "✓" : null}
                                                </span>
                                            )}
                                            <span>{field.label}</span>
                                            {field.type !== "checkbox" && (needsWritingLines ? (
                                                <div className="print-writing-lines">
                                                    {[0, 1, 2].map((line) => <div className="print-answer-line" key={line} />)}
                                                </div>
                                            ) : (
                                                <span className="print-answer-line">{showValues ? field.value : null}</span>
                                            ))}
                                        </div>
                                    ) : <div className="print-answer-line print-empty-line" />}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </section>
    );
}
