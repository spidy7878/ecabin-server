const { getPool } = require('../config/db');

/**
 * GET /api/issues
 * Returns all active issue types.
 */
async function getAll(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query(`
        SELECT IssueID, IssueName, IssueCode, Categories, IssuePriority
        FROM dbo.Issues
        WHERE IsActive = 1
        ORDER BY IssueName
      `);
    res.json(result.recordset);
  } catch (err) {
    console.error('issues.getAll error:', err.message);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
}

module.exports = { getAll };
