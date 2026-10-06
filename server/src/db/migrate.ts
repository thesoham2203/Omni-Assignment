import Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);

  const migrations: Array<{ version: number; sql: string }> = [
    { version: 1, sql: `
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (id, workspace_id)
    );

    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      customer_name TEXT NOT NULL,
      service TEXT NOT NULL,
      description TEXT,
      scheduled_date TEXT,
      status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','QUALIFIED','CLOSED')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (id, workspace_id),
      FOREIGN KEY (created_by, workspace_id) REFERENCES users(id, workspace_id)
    );

    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE REFERENCES requests(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (request_id, workspace_id) REFERENCES requests(id, workspace_id),
      FOREIGN KEY (created_by, workspace_id) REFERENCES users(id, workspace_id)
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES requests(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      action TEXT NOT NULL,
      details TEXT,
      performed_by TEXT NOT NULL REFERENCES users(id),
      performed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (request_id, workspace_id) REFERENCES requests(id, workspace_id),
      FOREIGN KEY (performed_by, workspace_id) REFERENCES users(id, workspace_id)
    );
  ` },
    { version: 2, sql: `
      CREATE INDEX IF NOT EXISTS idx_requests_workspace_created
        ON requests (workspace_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_activity_request_workspace
        ON activity_log (request_id, workspace_id, performed_at ASC);
      CREATE INDEX IF NOT EXISTS idx_work_items_workspace_created
        ON work_items (workspace_id, created_at DESC);
    ` },
  ];

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations ORDER BY version').all()
      .map((row) => (row as { version: number }).version)
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(migration.version);
    })();
  }
}
