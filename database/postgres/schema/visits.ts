import "../../../server/load";
import { db } from "../db";

const sql = db();

await sql`CREATE TABLE IF NOT EXISTS visits (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patient(patient_id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    forms_data JSONB NOT NULL
)`;

await sql`CREATE INDEX IF NOT EXISTS visits_patient_date_idx ON visits (patient_id, date DESC, time DESC, id DESC)`;
