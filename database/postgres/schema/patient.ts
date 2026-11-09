import "../../../server/load";
import { db } from "../db";

const sql = db();

await sql`CREATE TABLE IF NOT EXISTS patient (
    patient_id SERIAL PRIMARY KEY,
    start_forms JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    patient_unq_id VARCHAR(50) NOT NULL DEFAULT '',
    first_visit_date VARCHAR(10),
    first_visit_time VARCHAR(10),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT patient_unq_id_unique UNIQUE (patient_unq_id)
)`;

await sql`ALTER TABLE patient
    ADD COLUMN IF NOT EXISTS patient_unq_id VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS first_visit_date VARCHAR(10),
    ADD COLUMN IF NOT EXISTS first_visit_time VARCHAR(10),
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE`;

await sql`ALTER TABLE patient DROP CONSTRAINT IF EXISTS patient_unq_id_unique`;

await sql`ALTER TABLE patient
    ADD CONSTRAINT patient_unq_id_unique UNIQUE (patient_unq_id)`;

// start_forms keeps a filled-in copy of forms.layout; drop the array check added earlier
await sql`ALTER TABLE patient DROP CONSTRAINT IF EXISTS patient_start_forms_is_array`;

await sql`CREATE OR REPLACE FUNCTION set_patient_timestamps()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            NEW.created_at := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
            NEW.updated_at := COALESCE(NEW.updated_at, CURRENT_TIMESTAMP);
        ELSE
            NEW.created_at := OLD.created_at;
            NEW.updated_at := CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`;

await sql`DROP TRIGGER IF EXISTS patient_set_timestamps ON patient`;

await sql`CREATE TRIGGER patient_set_timestamps
    BEFORE INSERT OR UPDATE ON patient
    FOR EACH ROW
    EXECUTE FUNCTION set_patient_timestamps()`;