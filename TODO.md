Follow the steps below to finish setting up your application.

## PostgreSQL

Bati only installs the `postgres` client — **bring your own PostgreSQL server** (a local install, a managed instance, or e.g. `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`).

Set `DATABASE_URL` in `.env` to your connection string, then create the example table:

```bash
npm run postgres:migrate # creates the `todos` table
```

Queries use [postgres.js](https://github.com/porsager/postgres). See `database/postgres/` for the
client, schema and example queries.

