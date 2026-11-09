const app = require('./app');
const { initializeDatabase } = require('./db/initDb');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Ensure database tables exist before listening
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🌱 SeedShare Garden API Server is running!`);
      console.log(`🚀 Port: http://localhost:${PORT}`);
      console.log(`📋 Theme 17: Garden Plots & Soil Tracking`);
      console.log(`🔗 Leases JOIN Endpoint: http://localhost:${PORT}/leases`);
      console.log(`📊 Twist Summary Endpoint: http://localhost:${PORT}/plots/summary`);
      console.log(`🔍 Search by Soil: http://localhost:${PORT}/plots?soil=Loam`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
