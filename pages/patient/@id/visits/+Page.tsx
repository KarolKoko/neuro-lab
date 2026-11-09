import React, { useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import { onSearchVisits } from "./visits.telefunc";
import type { Data } from "./+data";

type SearchResults = Awaited<ReturnType<typeof onSearchVisits>>;

export default function Page() {
    const data = useData<Data>();
    const [terms, setTerms] = useState(data.terms.length ? data.terms : [""]);
    const [date, setDate] = useState(data.date);
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const base = `/patient/${data.patientId}/visits`;
    useEffect(() => {
        let active = true;
        if (!open || (!terms.some((term) => term.trim()) && !date)) {
            setResults(null); setLoading(false); setError(null);
            return () => { active = false; };
        }
        setResults(null); setError(null); setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const next = await onSearchVisits({ patientId: data.patientId, terms, date });
                if (active) setResults(next);
            } catch (err) {
                console.error("Nie udało się wyszukać wizyt:", err);
                if (active) setError("Nie udało się wyszukać wizyt. Spróbuj ponownie.");
            } finally {
                if (active) setLoading(false);
            }
        }, 300);
        return () => { active = false; clearTimeout(timer); };
    }, [terms, date, open, data.patientId]);
    const pageUrl = (page: number) => {
        const params = new URLSearchParams();
        data.terms.forEach((term) => params.append("q", term));
        if (data.date) params.set("date", data.date);
        params.set("page", String(page));
        return `${base}?${params}`;
    };

    return (
        <main className="my-6 rounded-xl bg-white p-5 shadow">
            <a href={`/patient/${data.patientId}`} className="underline">← Pacjent</a>
            <h1 className="mt-4 break-words text-3xl font-semibold [overflow-wrap:anywhere]">Rejestr wizyt: {data.patientIdentifier}</h1>
            <a href={`${base}/new`} className="inline-block rounded bg-sky-800 px-4 py-2 font-semibold text-white">Wizyta</a>
            <form action={base} method="get" className="relative my-5">
                <p className="text-sm text-gray-600">Szukaj po ID wizyty, nazwie formularza lub wartości pól. Wystarczy jedna pasująca fraza.</p>
                <div className="space-y-2">
                    {terms.map((term, index) => (
                        <div key={index} className="flex gap-2">
                            <label className="min-w-0 flex-1"><span className="sr-only">Fraza {index + 1}</span>
                                <input name="q" value={term} autoComplete="off" placeholder={`Fraza ${index + 1}`} className="w-full rounded border px-3 py-2"
                                    onFocus={() => setOpen(true)} onChange={(event) => {
                                        const value = event.target.value;
                                        setTerms((previous) => previous.map((item, i) => i === index ? value : item));
                                        setOpen(true);
                                    }} />
                            </label>
                            {terms.length > 1 && <button type="button" className="rounded border px-3" aria-label={`Usuń frazę ${index + 1}`} onClick={() => setTerms((previous) => previous.filter((_, i) => i !== index))}>Usuń</button>}
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                    <button type="button" className="rounded border px-3 py-2" onClick={() => setTerms((previous) => [...previous, ""])}>Dodaj frazę</button>
                    <label className="flex min-w-0 max-w-full flex-col gap-1 text-sm font-semibold">Data wizyty
                        <input type="date" name="date" value={date} className="max-w-full rounded border px-3 py-2 font-normal"
                            onFocus={() => setOpen(true)} onChange={(event) => { setDate(event.target.value); setOpen(true); }} />
                    </label>
                    <button type="submit" className="rounded bg-sky-800 px-4 py-2 font-semibold text-white">Szukaj</button>
                    <a href={base} className="rounded border px-4 py-2">Wyczyść</a>
                </div>
                {open && (loading || error || results) && (
                    <div className="absolute z-10 mt-2 max-h-80 w-full overflow-auto rounded border bg-white p-3 shadow-lg [overflow-wrap:anywhere]" aria-live="polite">
                        <button type="button" className="float-right underline" onClick={() => setOpen(false)}>Zamknij</button>
                        {loading && <p>Wyszukiwanie...</p>}
                        {error && <p role="alert" className="text-red-700">{error}</p>}
                        {results && <>
                            <p className="text-sm text-gray-600">Znaleziono: {results.total}{results.total > results.results.length && ` (wyświetlono ${results.results.length})`}</p>
                            {results.results.length === 0 && <p>Brak wyników.</p>}
                            <ul>{results.results.map((visit) => (
                                <li key={visit.id} className="border-t py-2">
                                    <a className="font-semibold underline" href={`${base}/${visit.id}`}>{visit.date} {visit.time} — {visit.names.join(", ")}</a>
                                    {visit.matches.map((match, index) => <div key={index} className="text-sm"><b>{match.label}:</b> {match.value}</div>)}
                                </li>
                            ))}</ul>
                        </>}
                    </div>
                )}
            </form>
            <p className="text-sm text-gray-600">Liczba wizyt: {data.total}</p>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead><tr className="border-b"><th className="p-3">Data</th><th className="p-3">Godzina</th><th className="p-3">Formularze</th><th className="p-3">Szczegóły</th></tr></thead>
                    <tbody>{data.visits.map((visit) => (
                        <tr key={visit.id} className="border-b">
                            <td className="p-3">{visit.date.split("-").reverse().join("-")}</td>
                            <td className="p-3">{visit.time}</td>
                            <td className="p-3">{visit.forms_data.map((form) => form.name).join(", ")}</td>
                            <td className="p-3"><a className="underline" href={`${base}/${visit.id}`}>Szczegóły<span className="sr-only"> wizyty {visit.date} {visit.time}</span></a></td>
                        </tr>
                    ))}
                    {data.visits.length === 0 && <tr><td colSpan={4} className="p-3">Brak wizyt na tej stronie.</td></tr>}</tbody>
                </table>
            </div>
            <nav aria-label="Paginacja wizyt" className="mt-4 flex flex-wrap gap-4">
                {data.page > 1 && <a className="underline" href={pageUrl(data.page - 1)}>Poprzednia</a>}
                <span>Strona {data.page} z {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
                {data.page * data.pageSize < data.total && <a className="underline" href={pageUrl(data.page + 1)}>Następna</a>}
            </nav>
        </main>
    );
}
