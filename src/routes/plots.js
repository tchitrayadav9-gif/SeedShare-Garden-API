const express = require('express');
const router = express.Router();
const { all, get, run } = require('../config/database');
const { validatePlot } = require('../middleware/validate');

/**
 * =================================================================
 * TWIST RULE ENDPOINT: Summary by soil
 * Route: GET /plots/summary
 * Returns: Array of soil types and their respective plot counts using GROUP BY
 * NOTE: Defined BEFORE /:id route so 'summary' is not interpreted as an ID
 * =================================================================
 */
router.get('/summary', async (req, res, next) => {
  try {
    const sql = `
      SELECT soil, COUNT(*) AS count 
      FROM plots 
      GROUP BY soil 
      ORDER BY count DESC
    `;
    const summary = await all(sql);
    // Returns 200 with count for each or empty array [] if no plots exist
    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * =================================================================
 * GET /plots
 * Returns all plots OR filters by query parameter (?soil=Loam)
 * Status: 200 OK
 * =================================================================
 */
router.get('/', async (req, res, next) => {
  try {
    const { soil } = req.query;

    if (soil && typeof soil === 'string' && soil.trim() !== '') {
      const sql = 'SELECT * FROM plots WHERE LOWER(soil) = LOWER(?) ORDER BY id ASC';
      const plots = await all(sql, [soil.trim()]);
      return res.status(200).json(plots);
    }

    const sql = 'SELECT * FROM plots ORDER BY id ASC';
    const plots = await all(sql);
    return res.status(200).json(plots);
  } catch (err) {
    next(err);
  }
});

/**
 * =================================================================
 * GET /plots/:id
 * Returns a single plot by ID
 * Status: 200 OK or 404 Not Found
 * =================================================================
 */
router.get('/:id', async (req, res, next) => {
  try {
    const plotId = parseInt(req.params.id, 10);
    if (isNaN(plotId)) {
      return res.status(400).json({ error: 'Invalid plot ID format. Must be an integer.' });
    }

    const plot = await get('SELECT * FROM plots WHERE id = ?', [plotId]);
    if (!plot) {
      return res.status(404).json({ error: `Plot with ID ${plotId} not found.` });
    }

    return res.status(200).json(plot);
  } catch (err) {
    next(err);
  }
});

/**
 * =================================================================
 * POST /plots
 * Add a new plot (name and soil required)
 * Status: 201 Created on success, 400 Bad Request on validation error
 * =================================================================
 */
router.post('/', validatePlot, async (req, res, next) => {
  try {
    const { name, soil } = req.body;
    const sql = 'INSERT INTO plots (name, soil) VALUES (?, ?)';
    const result = await run(sql, [name, soil]);

    const createdPlot = await get('SELECT * FROM plots WHERE id = ?', [result.lastID]);
    return res.status(201).json(createdPlot);
  } catch (err) {
    next(err);
  }
});

/**
 * =================================================================
 * PUT /plots/:id
 * Update an existing plot (name and soil required)
 * Status: 200 OK, 400 Bad Request, or 404 Not Found
 * =================================================================
 */
router.put('/:id', validatePlot, async (req, res, next) => {
  try {
    const plotId = parseInt(req.params.id, 10);
    if (isNaN(plotId)) {
      return res.status(400).json({ error: 'Invalid plot ID format. Must be an integer.' });
    }

    // Verify plot exists first
    const existing = await get('SELECT * FROM plots WHERE id = ?', [plotId]);
    if (!existing) {
      return res.status(404).json({ error: `Plot with ID ${plotId} not found.` });
    }

    const { name, soil } = req.body;
    const sql = 'UPDATE plots SET name = ?, soil = ? WHERE id = ?';
    await run(sql, [name, soil, plotId]);

    const updatedPlot = await get('SELECT * FROM plots WHERE id = ?', [plotId]);
    return res.status(200).json(updatedPlot);
  } catch (err) {
    next(err);
  }
});

/**
 * =================================================================
 * DELETE /plots/:id
 * Delete a plot by ID
 * Status: 200 OK or 404 Not Found
 * =================================================================
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const plotId = parseInt(req.params.id, 10);
    if (isNaN(plotId)) {
      return res.status(400).json({ error: 'Invalid plot ID format. Must be an integer.' });
    }

    const existing = await get('SELECT * FROM plots WHERE id = ?', [plotId]);
    if (!existing) {
      return res.status(404).json({ error: `Plot with ID ${plotId} not found.` });
    }

    await run('DELETE FROM plots WHERE id = ?', [plotId]);
    return res.status(200).json({
      message: 'Plot deleted successfully',
      deletedPlot: existing
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
