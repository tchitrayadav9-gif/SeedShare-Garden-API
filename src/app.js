const express = require('express');
const cors = require('cors');

// Import route modules
const plotsRouter = require('./routes/plots');
const gardenersRouter = require('./routes/gardeners');
const leasesRouter = require('./routes/leases');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health / Welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'SeedShare Garden API',
    theme: 'Garden plots (Theme 17 of 30)',
    status: 'online',
    version: '1.0.0',
    documentation: {
      plots: '/plots',
      plots_summary: '/plots/summary',
      plots_search_example: '/plots?soil=Loam',
      gardeners: '/gardeners',
      leases_joined: '/leases'
    }
  });
});

// Mount application routes
app.use('/plots', plotsRouter);
app.use('/gardeners', gardenersRouter);
app.use('/leases', leasesRouter);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

module.exports = app;
