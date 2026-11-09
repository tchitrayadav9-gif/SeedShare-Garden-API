const express = require('express');
const router = express.Router();
const { all, get, run } = require('../config/database');
const { validateGardener } = require('../middleware/validate');

/**
 * GET /gardeners
 * Fetch all gardeners
 * Status: 200 OK
 */
router.get('/', async (req, res, next) => {
  try {
    const gardeners = await all('SELECT * FROM gardeners ORDER BY id ASC');
    return res.status(200).json(gardeners);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /gardeners/:id
 * Fetch single gardener by ID
 * Status: 200 OK or 404 Not Found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const gardenerId = parseInt(req.params.id, 10);
    if (isNaN(gardenerId)) {
      return res.status(400).json({ error: 'Invalid gardener ID format. Must be an integer.' });
    }

    const gardener = await get('SELECT * FROM gardeners WHERE id = ?', [gardenerId]);
    if (!gardener) {
      return res.status(404).json({ error: `Gardener with ID ${gardenerId} not found.` });
    }

    return res.status(200).json(gardener);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /gardeners
 * Create a new gardener
 * Status: 201 Created or 400 Bad Request
 */
router.post('/', validateGardener, async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    // Check duplicate email
    const existing = await get('SELECT id FROM gardeners WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'A gardener with this email address already exists.' });
    }

    const sql = 'INSERT INTO gardeners (name, email, phone) VALUES (?, ?, ?)';
    const result = await run(sql, [name, email, phone || null]);

    const createdGardener = await get('SELECT * FROM gardeners WHERE id = ?', [result.lastID]);
    return res.status(201).json(createdGardener);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /gardeners/:id
 * Update an existing gardener
 * Status: 200 OK, 400 Bad Request, or 404 Not Found
 */
router.put('/:id', validateGardener, async (req, res, next) => {
  try {
    const gardenerId = parseInt(req.params.id, 10);
    if (isNaN(gardenerId)) {
      return res.status(400).json({ error: 'Invalid gardener ID format. Must be an integer.' });
    }

    const existing = await get('SELECT * FROM gardeners WHERE id = ?', [gardenerId]);
    if (!existing) {
      return res.status(404).json({ error: `Gardener with ID ${gardenerId} not found.` });
    }

    const { name, email, phone } = req.body;

    // Check email uniqueness if email changed
    const emailConflict = await get('SELECT id FROM gardeners WHERE email = ? AND id != ?', [email, gardenerId]);
    if (emailConflict) {
      return res.status(400).json({ error: 'Another gardener is already using this email address.' });
    }

    const sql = 'UPDATE gardeners SET name = ?, email = ?, phone = ? WHERE id = ?';
    await run(sql, [name, email, phone || null, gardenerId]);

    const updated = await get('SELECT * FROM gardeners WHERE id = ?', [gardenerId]);
    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /gardeners/:id
 * Delete a gardener by ID
 * Status: 200 OK or 404 Not Found
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const gardenerId = parseInt(req.params.id, 10);
    if (isNaN(gardenerId)) {
      return res.status(400).json({ error: 'Invalid gardener ID format. Must be an integer.' });
    }

    const existing = await get('SELECT * FROM gardeners WHERE id = ?', [gardenerId]);
    if (!existing) {
      return res.status(404).json({ error: `Gardener with ID ${gardenerId} not found.` });
    }

    await run('DELETE FROM gardeners WHERE id = ?', [gardenerId]);
    return res.status(200).json({
      message: 'Gardener deleted successfully',
      deletedGardener: existing
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
