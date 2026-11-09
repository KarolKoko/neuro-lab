function postgresEnvironment(databaseUrl, environment = process.env) {
    if (!databaseUrl) throw new Error("Missing DATABASE_URL");
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        !url.username || !url.password || url.pathname.length < 2 ||
        url.search || url.hash) {
        throw new Error("DATABASE_URL must contain local PostgreSQL credentials and a database name, without query parameters");
    }

    const env = { ...environment };
    for (const key of Object.keys(env)) {
        if (key.toUpperCase().startsWith("PG")) delete env[key];
    }
    return {
        ...env,
        PGHOST: url.hostname === "[::1]" ? "::1" : url.hostname,
        PGPORT: url.port || "5432",
        PGUSER: decodeURIComponent(url.username),
        PGPASSWORD: decodeURIComponent(url.password),
        PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    };
}

module.exports = { postgresEnvironment };
