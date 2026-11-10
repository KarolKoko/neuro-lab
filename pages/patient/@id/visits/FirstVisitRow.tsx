import React from "react";

export function FirstVisitRow({ patientId, date, time, formNames }: {
    patientId: number;
    date: string | null;
    time: string | null;
    formNames: string[];
}) {
    return (
        <tr className="border-b bg-sky-50">
            <td className="p-3">{date || "—"} <span className="block text-xs text-gray-600">Pierwsza wizyta</span></td>
            <td className="p-3">{time || "—"}</td>
            <td className="p-3">{formNames.join(", ") || "—"}</td>
            <td className="p-3"><a className="underline" href={`/patient/${patientId}`}>Szczegóły<span className="sr-only"> pierwszej wizyty</span></a></td>
        </tr>
    );
}
