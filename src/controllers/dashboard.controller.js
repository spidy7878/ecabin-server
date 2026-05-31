const { getPool, sql } = require('../config/db');

const dashboardController = {
  async getDashboard(req, res) {
    const pool = await getPool();

    // req.user is set by requireAuth middleware.
    // Admin / Manager → see all aircraft audits.
    // User (inspector)  → see only audits where LastAuditPerson matches their full name.
    const isPrivileged = req.user.role === 'Admin' || req.user.role === 'Manager';
    const inspectorName = req.user.fullName; // "Bikram Jyoti Sinha"

    const request = pool.request();
    let whereClause = `WHERE (aa.Delmark != 'Y' OR aa.Delmark IS NULL)`;

    if (!isPrivileged) {
      request.input('inspector', sql.NVarChar(200), inspectorName);
      whereClause += ` AND LOWER(aa.LastAuditPerson) = LOWER(@inspector)`;
    }

    const result = await request.query(`
      SELECT
        aa.AuditId,
        aa.AircraftId,
        a.MSN,
        a.Registration,
        a.AircraftType,
        CONVERT(varchar(10), aa.LastAuditDate, 120)  AS LastAuditDate,
        RTRIM(aa.LastAuditBase)                       AS LastAuditBase,
        aa.LastAuditPerson,
        aa.IssuesReported,
        aa.ExistingIssues,
        CONVERT(varchar(10), aa.NextAuditDate, 120)  AS NextAuditDate,
        CASE
          WHEN aa.NextAuditDate < CAST(GETDATE() AS DATE)
               THEN 'Overdue'
          WHEN aa.NextAuditDate <= CAST(DATEADD(day, 30, GETDATE()) AS DATE)
               THEN 'Due Soon'
          ELSE 'Upcoming'
        END AS TaskStatus
      FROM AircraftAudits aa
      JOIN Aircraft a ON aa.AircraftId = a.AircraftId
      ${whereClause}
      ORDER BY aa.NextAuditDate ASC
    `);

    const tasks = result.recordset;
    const stats = {
      total:    tasks.length,
      overdue:  tasks.filter(t => t.TaskStatus === 'Overdue').length,
      dueSoon:  tasks.filter(t => t.TaskStatus === 'Due Soon').length,
      upcoming: tasks.filter(t => t.TaskStatus === 'Upcoming').length,
    };

    res.json({ stats, tasks, role: req.user.role });
  },
};

module.exports = dashboardController;
