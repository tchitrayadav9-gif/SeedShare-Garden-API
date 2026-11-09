const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine database path (allows override for automated testing)
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(`❌ Error connecting to SQLite database at ${dbPath}:`, err.message);
  } else if (process.env.NODE_ENV !== 'test') {
    console.log(` Connected to SQLite database: ${dbPath}`);
  }
});

// Enforce foreign key constraints in SQLite
db.run('PRAGMA foreign_keys = ON;', (err) => {
  if (err) {
    console.error('Failed to enable foreign keys:', err.message);
  }
});

/**
 * Promise wrapper for db.all (fetch multiple rows)
 */
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

/**
 * Promise wrapper for db.get (fetch single row)
 */
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

/**
 * Promise wrapper for db.run (INSERT, UPDATE, DELETE)
 * Returns object with lastID and changes
 */
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

/**
 * Promise wrapper for db.exec (batch execution, e.g. migrations)
 */
const exec = (sql) => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

module.exports = {
  db,
  all,
  get,
  run,
  exec
};
