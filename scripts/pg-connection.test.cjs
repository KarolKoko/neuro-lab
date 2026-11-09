const assert = require("node:assert/strict");
const { test } = require("node:test");
const { postgresEnvironment } = require("./pg-connection.cjs");

test("maps a PostgreSQL URL to libpq variables without leaking stale PG settings", () => {
    const env = postgresEnvironment("postgresql://test%40user:p%40ss%3Aword@localhost:5433/test%20db", {
        PATH: "path", PGHOSTADDR: "192.0.2.1", PGSSLMODE: "require",
    });
    assert.equal(env.PGHOST, "localhost");
    assert.equal(env.PGPORT, "5433");
    assert.equal(env.PGUSER, "test@user");
    assert.equal(env.PGPASSWORD, "p@ss:word");
    assert.equal(env.PGDATABASE, "test db");
    assert.equal(env.PGHOSTADDR, undefined);
    assert.equal(env.PGSSLMODE, undefined);
    assert.equal(env.PATH, "path");
});

test("rejects unsupported database connections", () => {
    for (const url of ["", "postgresql://user:pass@remote/db", "postgresql://user:pass@localhost/db?sslmode=require", "postgresql://user@localhost/db"]) {
        assert.throws(() => postgresEnvironment(url, {}));
    }
});
