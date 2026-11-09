/** Validates time in the HH:MM:SS format (00:00:00 - 23:59:59). */
export function isValidTime(value: string): boolean {
    const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);
    if (!match) return false;

    const [hours, minutes, seconds] = match.slice(1).map(Number);
    return hours <= 23 && minutes <= 59 && seconds <= 59;
}

/** Validates an existing calendar date in the DD-MM-YYYY format (e.g. 29-02-2024). */
export function isValidDate(value: string): boolean {
    const match = /^([0-3]\d)-([01]\d)-(\d{4})$/.exec(value);
    if (!match) return false;

    const [day, month, year] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    // Date rolls invalid days over (e.g. 31-02 -> 03-03), so compare the parts back
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}
