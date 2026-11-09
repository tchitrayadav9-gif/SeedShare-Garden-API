const { exec } = require('../config/database');

const schemaSql = `
  CREATE TABLE IF NOT EXISTS gardeners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    soil TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gardener_id INTEGER NOT NULL,
    plot_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gardener_id) REFERENCES gardeners(id) ON DELETE CASCADE,
    FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE CASCADE
  );
`;

const initializeDatabase = async () => {
  try {
    await exec(schemaSql);
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Database schema initialized successfully (gardeners, plots, leases tables created).');
    }
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err.message);
    throw err;
  }
};

// If run directly from terminal
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization complete.');
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { initializeDatabase, schemaSql };
