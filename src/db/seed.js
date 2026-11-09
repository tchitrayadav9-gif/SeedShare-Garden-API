const { run, exec } = require('../config/database');
const { initializeDatabase } = require('./initDb');

const seedData = async () => {
  try {
    await initializeDatabase();

    // Clear existing data in correct FK order
    await exec(`
      DELETE FROM leases;
      DELETE FROM plots;
      DELETE FROM gardeners;
      DELETE FROM sqlite_sequence WHERE name IN ('leases', 'plots', 'gardeners');
    `);

    // Insert Gardeners
    await run(`
      INSERT INTO gardeners (name, email, phone) VALUES 
        ('Alice Green', 'alice.green@example.com', '555-0101'),
        ('Bob Thorne', 'bob.thorne@example.com', '555-0102'),
        ('Clara Bloom', 'clara.bloom@example.com', '555-0103');
    `);

    // Insert Plots with different soil types (Loam, Sandy, Clay)
    await run(`
      INSERT INTO plots (name, soil) VALUES 
        ('Plot 1 - North Ridge', 'Loam'),
        ('Plot 2 - Sun Valley', 'Sandy'),
        ('Plot 3 - Creek Meadow', 'Loam'),
        ('Plot 4 - West Terrace', 'Clay'),
        ('Plot 5 - Orchard Hill', 'Loam');
    `);

    // Insert Leases (resolving the theme: linking gardener to plot with tracked soil)
    await run(`
      INSERT INTO leases (gardener_id, plot_id, start_date, end_date, status) VALUES 
        (1, 1, '2026-03-01', '2026-11-30', 'active'),
        (2, 2, '2026-04-01', '2026-10-31', 'active'),
        (3, 4, '2026-05-01', '2026-12-31', 'active');
    `);

    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Seed data inserted successfully:');
      console.log('   - 3 Gardeners');
      console.log('   - 5 Plots (3 Loam, 1 Sandy, 1 Clay)');
      console.log('   - 3 Leases with joined relationships');
    }
  } catch (err) {
    console.error('❌ Failed to seed database:', err.message);
    throw err;
  }
};

if (require.main === module) {
  seedData()
    .then(() => {
      console.log('Seeding complete.');
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = { seedData };
