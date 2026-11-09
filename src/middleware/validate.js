/**
 * Validation Middleware for SeedShare Garden API
 * Handles input checks and returns 400 Bad Request with descriptive error messages.
 */

/**
 * Validates Plot payload for POST (add) and PUT (update)
 * Required fields: name (non-empty string), soil (non-empty string)
 */
const validatePlot = (req, res, next) => {
  const { name, soil } = req.body;

  const errors = [];

  if (name === undefined || name === null || typeof name !== 'string' || name.trim() === '') {
    errors.push("Field 'name' is required and must be a non-empty string.");
  }

  if (soil === undefined || soil === null || typeof soil !== 'string' || soil.trim() === '') {
    errors.push("Field 'soil' is required and must be a non-empty string.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      message: errors.join(' ')
    });
  }

  // Normalize trimmed values
  req.body.name = name.trim();
  req.body.soil = soil.trim();

  next();
};

/**
 * Validates Gardener payload for POST and PUT
 * Required fields: name, email
 */
const validateGardener = (req, res, next) => {
  const { name, email } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push("Field 'name' is required and must be a non-empty string.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push("Field 'email' is required and must be a valid email address.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      message: errors.join(' ')
    });
  }

  req.body.name = name.trim();
  req.body.email = email.trim();
  if (req.body.phone) req.body.phone = req.body.phone.trim();

  next();
};

/**
 * Validates Lease payload for POST
 * Required fields: gardener_id (integer), plot_id (integer), start_date (string)
 */
const validateLease = (req, res, next) => {
  const { gardener_id, plot_id, start_date } = req.body;
  const errors = [];

  if (!gardener_id || isNaN(parseInt(gardener_id, 10))) {
    errors.push("Field 'gardener_id' is required and must be a valid numeric ID.");
  }

  if (!plot_id || isNaN(parseInt(plot_id, 10))) {
    errors.push("Field 'plot_id' is required and must be a valid numeric ID.");
  }

  if (!start_date || typeof start_date !== 'string' || start_date.trim() === '') {
    errors.push("Field 'start_date' is required (e.g. YYYY-MM-DD).");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      message: errors.join(' ')
    });
  }

  req.body.gardener_id = parseInt(gardener_id, 10);
  req.body.plot_id = parseInt(plot_id, 10);
  req.body.start_date = start_date.trim();

  next();
};

module.exports = {
  validatePlot,
  validateGardener,
  validateLease
};
