import React from "react";
import { useData } from "vike-react/useData";
import { usePageContext } from "vike-react/usePageContext";
import type { Data } from "./+data";

const actions = [
    { href: "/formCreator", title: "Stwórz formularz", description: "Zaprojektuj formularz, który wykorzystasz podczas pracy z pacjentami." },
    { href: "/newPatient", title: "Nowy pacjent", description: "Dodaj pacjenta i uzupełnij jego pierwsze formularze." },
    { href: "/patients", title: "Pacjenci", description: "Przeglądaj pacjentów, wyszukuj informacje i zarządzaj wizytami." },
];

export default function Page() {
    const { user } = usePageContext();
    const { recentPatients } = useData<Data>();
    return (
        <main className="my-6 space-y-6">
            <header className="rounded-xl bg-white p-6 shadow">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-sky-700">NeuroLab</p>
                <h1 className="mb-2 text-3xl font-semibold [overflow-wrap:anywhere]">Witaj{user?.name ? `, ${user.name}` : ""}!</h1>
                <p className="text-gray-600">Zarządzaj formularzami i wizytami pacjentów w jednym miejscu.</p>
            </header>
            <section aria-labelledby="quick-actions" className="rounded-xl bg-white p-6 shadow">
                <h2 id="quick-actions" className="mb-4 text-xl font-semibold">Szybkie akcje</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    {actions.map((action) => (
                        <a key={action.href} href={action.href} className="group rounded-lg border border-sky-200 bg-sky-50 p-4 transition-colors hover:border-sky-500 hover:bg-sky-100">
                            <h3 className="text-lg font-semibold text-sky-900 group-hover:text-sky-700">{action.title} <span aria-hidden="true">→</span></h3>
                            <p className="mt-2 text-sm text-gray-600">{action.description}</p>
                        </a>
                    ))}
                </div>
            </section>
            <section aria-labelledby="recent-patients" className="rounded-xl bg-white p-6 shadow">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 id="recent-patients" className="text-xl font-semibold">Ostatni pacjenci</h2>
                    <a href="/patients" className="text-sm font-semibold underline">Wszyscy pacjenci</a>
                </div>
                <p className="mb-3 text-sm text-gray-600">Pacjenci z najnowszą datą wizyty.</p>
                {recentPatients.length === 0 ? (
                    <p className="rounded-lg bg-sky-50 p-4 text-gray-600">Nie ma jeszcze pacjentów. Dodaj pierwszego pacjenta, aby rozpocząć.</p>
                ) : (
                    <ul className="list-none divide-y divide-gray-200 pl-0">
                        {recentPatients.map((patient) => (
                            <li key={patient.patient_id}>
                                <a href={`/patient/${patient.patient_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded px-2 py-3 hover:bg-sky-50">
                                    <span className="min-w-0 font-semibold text-sky-900 [overflow-wrap:anywhere]">{patient.patient_unq_id}</span>
                                    <span className="text-sm text-gray-600">Ostatnia wizyta: {patient.last_visit_date || "brak daty"}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}
