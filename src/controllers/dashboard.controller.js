const { getPool, sql } = require('../config/db');

const dashboardController = {
  async getDashboard(req, res) {
    const pool = await getPool();

    // req.user is set by requireAuth middleware.  Only inspectors (role 'User')
    // can sign in, and each one sees only the audit schedule for the aircraft
    // assigned to them in dbo.InspectionDet (InspectionDet.AircraftId stores the
    // MSN, matched against Aircraft.MSN; soft-deleted rows are excluded).
    const request = pool.request().input('userId', sql.Int, req.user.userId);
    const whereClause = `
      WHERE (aa.Delmark != 'Y' OR aa.Delmark IS NULL)
        AND EXISTS (
          SELECT 1
          FROM dbo.InspectionDet d
          WHERE CAST(d.AircraftId AS nvarchar(10)) = a.MSN
            AND d.UserID = @userId
            AND RTRIM(d.InspectionDelmark) = 'N'
        )`;

    // An aircraft can have several rows in AircraftAudits (full audit history).
    // The inspector schedule shows ONE card per assigned aircraft — its most
    // recent audit record (highest AuditId) — so the dashboard isn't cluttered
    // with historical rows and the stats reflect distinct aircraft.
    const result = await request.query(`
      WITH scoped AS (
        SELECT
          aa.AuditId,
          aa.AircraftId,
          a.MSN,
          a.Registration,
          a.AircraftType,
          aa.LastAuditDate,
          aa.LastAuditBase,
          aa.LastAuditPerson,
          aa.IssuesReported,
          aa.ExistingIssues,
          aa.NextAuditDate,
          ROW_NUMBER() OVER (PARTITION BY aa.AircraftId ORDER BY aa.AuditId DESC) AS rn
        FROM AircraftAudits aa
        JOIN Aircraft a ON aa.AircraftId = a.AircraftId
        ${whereClause}
      )
      SELECT
        AuditId,
        AircraftId,
        MSN,
        Registration,
        AircraftType,
        CONVERT(varchar(10), LastAuditDate, 120)  AS LastAuditDate,
        RTRIM(LastAuditBase)                      AS LastAuditBase,
        LastAuditPerson,
        IssuesReported,
        ExistingIssues,
        CONVERT(varchar(10), NextAuditDate, 120)  AS NextAuditDate,
        CASE
          WHEN NextAuditDate < CAST(GETDATE() AS DATE)
               THEN 'Overdue'
          WHEN NextAuditDate <= CAST(DATEADD(day, 30, GETDATE()) AS DATE)
               THEN 'Due Soon'
          ELSE 'Upcoming'
        END AS TaskStatus
      FROM scoped
      WHERE rn = 1
      ORDER BY NextAuditDate ASC
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
