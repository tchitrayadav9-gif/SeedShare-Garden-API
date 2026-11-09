const express = require('express');
const router = express.Router();
const { all, get, run } = require('../config/database');
const { validateLease } = require('../middleware/validate');

/**
 * =================================================================
 * JOIN ENDPOINT: Leases with Gardener Name and Plot Name
 * Route: GET /leases (and GET /leases/details)
 * Solves: "Two gardeners were promised the same plot, and nobody tracks the soil type. 
 *          Please build us a system that fixes this."
 * Status: 200 OK
 * =================================================================
 */
const getJoinedLeases = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        leases.id AS lease_id,
        leases.gardener_id,
        gardeners.name AS gardener_name,
        gardeners.email AS gardener_email,
        leases.plot_id,
        plots.name AS plot_name,
        plots.soil AS plot_soil,
        leases.start_date,
        leases.end_date,
        leases.status,
        leases.created_at
      FROM leases
      INNER JOIN gardeners ON leases.gardener_id = gardeners.id
      INNER JOIN plots ON leases.plot_id = plots.id
      ORDER BY leases.id ASC
    `;
    const leases = await all(sql);
    return res.status(200).json(leases);
  } catch (err) {
    next(err);
  }
};

router.get('/', getJoinedLeases);
router.get('/details', getJoinedLeases);

/**
 * GET /leases/:id
 * Fetch single lease with joined gardener and plot details
 * Status: 200 OK or 404 Not Found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const leaseId = parseInt(req.params.id, 10);
    if (isNaN(leaseId)) {
      return res.status(400).json({ error: 'Invalid lease ID format. Must be an integer.' });
    }

    const sql = `
      SELECT 
        leases.id AS lease_id,
        leases.gardener_id,
        gardeners.name AS gardener_name,
        gardeners.email AS gardener_email,
        leases.plot_id,
        plots.name AS plot_name,
        plots.soil AS plot_soil,
        leases.start_date,
        leases.end_date,
        leases.status,
        leases.created_at
      FROM leases
      INNER JOIN gardeners ON leases.gardener_id = gardeners.id
      INNER JOIN plots ON leases.plot_id = plots.id
      WHERE leases.id = ?
    `;
    const lease = await get(sql, [leaseId]);
    if (!lease) {
      return res.status(404).json({ error: `Lease with ID ${leaseId} not found.` });
    }

    return res.status(200).json(lease);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /leases
 * Create a new lease connecting a gardener and a plot
 * Validates existence of gardener and plot
 * Status: 201 Created or 400 Bad Request
 */
router.post('/', validateLease, async (req, res, next) => {
  try {
    const { gardener_id, plot_id, start_date, end_date, status = 'active' } = req.body;

    // Check gardener existence
    const gardener = await get('SELECT id, name FROM gardeners WHERE id = ?', [gardener_id]);
    if (!gardener) {
      return res.status(400).json({ error: `Cannot create lease: Gardener with ID ${gardener_id} does not exist.` });
    }

    // Check plot existence
    const plot = await get('SELECT id, name, soil FROM plots WHERE id = ?', [plot_id]);
    if (!plot) {
      return res.status(400).json({ error: `Cannot create lease: Plot with ID ${plot_id} does not exist.` });
    }

    // Check if plot is already leased with active status (prevents duplicate promise bug from theme!)
    const activeLease = await get(
      "SELECT id FROM leases WHERE plot_id = ? AND status = 'active'",
      [plot_id]
    );
    if (activeLease) {
      return res.status(400).json({
        error: `Conflict: Plot '${plot.name}' (ID ${plot_id}) is already actively leased under Lease #${activeLease.id}. Two gardeners cannot be promised the same plot!`
      });
    }

    const sql = `
      INSERT INTO leases (gardener_id, plot_id, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [gardener_id, plot_id, start_date, end_date || null, status]);

    // Return the joined record
    const created = await get(`
      SELECT 
        leases.id AS lease_id,
        leases.gardener_id,
        gardeners.name AS gardener_name,
        leases.plot_id,
        plots.name AS plot_name,
        plots.soil AS plot_soil,
        leases.start_date,
        leases.end_date,
        leases.status,
        leases.created_at
      FROM leases
      JOIN gardeners ON leases.gardener_id = gardeners.id
      JOIN plots ON leases.plot_id = plots.id
      WHERE leases.id = ?
    `, [result.lastID]);

    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /leases/:id
 * Delete a lease by ID
 * Status: 200 OK or 404 Not Found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const leaseId = parseInt(req.params.id, 10);
    if (isNaN(leaseId)) {
      return res.status(400).json({ error: 'Invalid lease ID format. Must be an integer.' });
    }

    const existing = await get('SELECT * FROM leases WHERE id = ?', [leaseId]);
    if (!existing) {
      return res.status(404).json({ error: `Lease with ID ${leaseId} not found.` });
    }

    await run('DELETE FROM leases WHERE id = ?', [leaseId]);
    return res.status(200).json({
      message: 'Lease deleted successfully',
      deletedLease: existing
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
