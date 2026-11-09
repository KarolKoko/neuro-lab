Follow the steps below to finish setting up your application.

## PostgreSQL

Bati only installs the `postgres` client — **bring your own PostgreSQL server** (a local install, a managed instance, or e.g. `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`).

Run the PostgreSQL setup script as a PostgreSQL administrator (using `psql`):

```bash
psql -U postgres -d postgres -f database/postgres/setup.sql
```

The script creates the `office` database, the `forms` table, and the timestamp trigger. Then set `DATABASE_URL` in `.env` to the application's connection string, for example `postgres://USER:PASSWORD@HOST:5432/office`, and restart the app. Restrict network access to PostgreSQL to the application server (or a private network); do not expose it publicly longer than needed.

To create or update the schema through the application:

```bash
npm run postgres:migrate # creates the `todos` and `forms` tables
```

Queries use [postgres.js](https://github.com/porsager/postgres). See `database/postgres/` for the
client, schema and example queries.

## MY TODO
- dokończyć konfigurację Lambda dla Cognito, spięcie z RDS
    - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
    - https://repost.aws/questions/QUelfFRZ3rRWOV1TspkoAujw/looking-for-node-js-examples-to-post-to-aurora-postgresql-via-lambda
