import React, { useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";
import { onSearchPatients } from "./patients.telefunc";
import { TrashPatientButton } from "../../components/TrashPatientButton";

type SearchResults = Awaited<ReturnType<typeof onSearchPatients>>;

export default function Page() {
    const data = useData<Data>();
    const [terms, setTerms] = useState(data.terms.length ? data.terms : [""]);
    const [date, setDate] = useState(data.date);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<SearchResults | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        if (!showResults || (!terms.some((term) => term.trim()) && !date)) {
            setResults(null);
            setSearchError(null);
            setLoading(false);
            return () => { active = false; };
        }
        setResults(null);
        setSearchError(null);
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const nextResults = await onSearchPatients({ terms, date });
                if (active) setResults(nextResults);
            } catch (error) {
                console.error("Nie udało się wyszukać pacjentów:", error);
                if (active) setSearchError("Nie udało się wyszukać pacjentów. Spróbuj ponownie.");
            } finally {
                if (active) setLoading(false);
            }
        }, 300);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [terms, date, showResults]);

    const pageCount = Math.ceil(data.total / data.pageSize);
    const pageUrl = (page: number) => {
        const params = new URLSearchParams();
        data.terms.forEach((term) => params.append("q", term));
        if (data.date) params.set("date", data.date);
        if (data.patientId !== undefined) params.set("patient", String(data.patientId));
        params.set("page", String(page));
        return `/patients?${params}`;
    };

    return (
        <main className="my-6 rounded-xl bg-white p-5 shadow">
            <h1 className="mb-5 text-3xl font-semibold">Pacjenci</h1>
            <form action="/patients" method="get" className="relative mb-6">
                <p className="mb-2 text-sm text-gray-600">Wyszukaj identyfikator pacjenta lub wartości pól formularzy. Wystarczy dopasowanie jednej frazy.</p>
                <div className="space-y-2">
                    {terms.map((term, index) => (
                        <div key={index} className="flex gap-2">
                            <label className="min-w-0 flex-1">
                                <span className="sr-only">Fraza {index + 1}</span>
                                <input
                                    name="q"
                                    value={term}
                                    onFocus={() => setShowResults(true)}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setTerms((previous) => previous.map((item, i) => i === index ? value : item));
                                        setShowResults(true);
                                    }}
                                    placeholder={`Fraza ${index + 1}`}
                                    autoComplete="off"
                                    className="w-full rounded border px-3 py-2"
                                />
                            </label>
                            {terms.length > 1 && (
                                <button type="button" className="rounded border px-3" aria-label={`Usuń frazę ${index + 1}`} onClick={() => setTerms((previous) => previous.filter((_, i) => i !== index))}>Usuń</button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                    <button type="button" className="rounded border px-3 py-2" onClick={() => setTerms((previous) => [...previous, ""])}>Dodaj frazę</button>
                    <label className="flex min-w-0 max-w-full flex-col gap-1 text-sm font-semibold">
                        Data ostatniej wizyty
                        <input type="date" name="date" value={date} onFocus={() => setShowResults(true)} onChange={(event) => { setDate(event.target.value); setShowResults(true); }} className="max-w-full rounded border px-3 py-2 font-normal" />
                    </label>
                    <button type="submit" className="rounded bg-sky-800 px-4 py-2 font-semibold text-white">Szukaj</button>
                    <a href="/patients" className="rounded border px-4 py-2">Wyczyść</a>
                </div>
                {showResults && (loading || searchError || results) && (
                    <div className="absolute z-10 mt-2 max-h-80 w-full overflow-auto break-words rounded border bg-white p-3 shadow-lg [overflow-wrap:anywhere]" aria-live="polite">
                        <button type="button" className="float-right underline" onClick={() => setShowResults(false)}>Zamknij</button>
                        {loading && <p>Wyszukiwanie...</p>}
                        {searchError && <p role="alert" className="text-red-700">{searchError}</p>}
                        {results && (
                            <>
                                <p className="mb-2 text-sm text-gray-600">Znaleziono: {results.total}{results.total > results.results.length && ` (wyświetlono ${results.results.length})`}</p>
                                {results.results.length === 0 && <p>Brak wyników.</p>}
                                <ul>
                                    {results.results.map((result) => (
                                        <li key={result.patientId} className="border-t py-2">
                                            <a href={`/patient/${result.patientId}`} className="font-semibold text-sky-800 underline">{result.identifier}</a>
                                            <span className="ml-2 text-sm text-gray-600">ID: {result.patientId}</span>
                                            {result.matches.map((match, index) => (
                                                <div key={index} className="text-sm"><span className="font-medium">{match.label}:</span> {match.value}</div>
                                            ))}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}
            </form>

            <p className="mb-2 text-sm text-gray-600">Liczba pacjentów: {data.total}.</p>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead><tr className="border-b">
                        <th scope="col" className="p-3">Unikalny identyfikator pacjenta</th>
                        <th scope="col" className="p-3">Data ostatniej wizyty</th>
                        <th scope="col" className="p-3">Uzupełnione formularze</th>
                        {/* <th scope="col" className="p-3">Akcje</th> */}
                    </tr></thead>
                    <tbody>
                        {data.patients.map((patient) => (
                            <tr key={patient.patient_id} className="border-b">
                                <td className="p-3"><a className="font-semibold text-sky-800 underline" href={`/patient/${patient.patient_id}`}>{patient.patient_unq_id}</a></td>
                                <td className="p-3">{patient.last_visit_date || "—"}</td>
                                <td className="p-3">{Array.from(new Set([
                                    ...(Array.isArray(patient.start_forms) ? patient.start_forms : []),
                                    ...(patient.visit_forms ?? []),
                                ].filter((form) => form.completed === true).map((form) => form.name))).join(", ") || "—"}</td>
                                {/* <td className="p-3"><TrashPatientButton patientId={patient.patient_id} identifier={patient.patient_unq_id} onTrashed={() => window.location.reload()} /></td> */}
                            </tr>
                        ))}
                        {data.patients.length === 0 && <tr><td colSpan={4} className="p-3">Brak pacjentów na tej stronie.</td></tr>}
                    </tbody>
                </table>
            </div>
            <nav aria-label="Paginacja pacjentów" className="mt-4 flex flex-wrap items-center gap-4">
                {data.page > 1 && <a className="underline" href={pageUrl(data.page - 1)}>Poprzednia</a>}
                <span>Strona {data.page} z {Math.max(pageCount, 1)}</span>
                {data.page < pageCount && <a className="underline" href={pageUrl(data.page + 1)}>Następna</a>}
            </nav>
        </main>
    );
}
