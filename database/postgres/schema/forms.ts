import "../../../server/load";
import { db } from "../db";

const sql = db();

await sql`CREATE TABLE IF NOT EXISTS forms (
    name TEXT NOT NULL,
    layout JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

await sql`ALTER TABLE forms
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS form_id SERIAL PRIMARY KEY NOT NULL`;

await sql`CREATE OR REPLACE FUNCTION set_forms_timestamps()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            NEW.created_at := COALESCE(NEW.created_at, CURRENT_TIMESTAMP);
            NEW.updated_at := COALESCE(NEW.updated_at, CURRENT_TIMESTAMP);
        ELSE
            NEW.updated_at := CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`;

await sql`DROP TRIGGER IF EXISTS forms_set_timestamps ON forms`;

await sql`CREATE TRIGGER forms_set_timestamps
    BEFORE INSERT OR UPDATE ON forms
    FOR EACH ROW
    EXECUTE FUNCTION set_forms_timestamps()`;
