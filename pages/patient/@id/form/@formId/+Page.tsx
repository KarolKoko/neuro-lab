import React, { useEffect } from "react";
import { useData } from "vike-react/useData";
import { PrintableForm } from "../../../../../components/PrintableForm";
import printerIcon from "../../../../../assets/printer.svg";
import type { Data } from "./+data";

export default function Page() {
    const { patientId, patientIdentifier, form } = useData<Data>();
    useEffect(() => {
        document.body.classList.add("printing-patient-form");
        return () => document.body.classList.remove("printing-patient-form");
    }, []);

    return (
        <main className="my-6">
            <div className="mb-4 rounded-lg bg-white p-4">
                <a className="font-semibold underline" href={`/patient/${patientId}`}>← Powrót do pacjenta</a>
                <p className="[overflow-wrap:anywhere]">Pacjent: {patientIdentifier}</p>
                {form.completed !== true && <p className="font-semibold">Formularz nieukończony</p>}
                <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded border px-4 py-2 font-semibold">
                    <img className="h-4 w-4" src={printerIcon} alt="" />
                    Drukuj formularz
                </button>
            </div>
            <PrintableForm title={form.name} layout={form.layout} showValues />
        </main>
    );
}
