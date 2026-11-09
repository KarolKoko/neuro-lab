import React from "react";
import { useData } from "vike-react/useData";
import { PrintableForm } from "../../../../../components/PrintableForm";
import type { Data } from "./+data";

export default function Page() {
    const { patientId, patientIdentifier, form } = useData<Data>();
    return (
        <main className="my-6">
            <div className="mb-4 rounded-lg bg-white p-4">
                <a className="font-semibold underline" href={`/patient/${patientId}`}>← Powrót do pacjenta</a>
                <p>Pacjent: {patientIdentifier}</p>
                {form.completed !== true && <p className="font-semibold">Formularz nieukończony</p>}
            </div>
            <PrintableForm title={form.name} layout={form.layout} showValues />
        </main>
    );
}
