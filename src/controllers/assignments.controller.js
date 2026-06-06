const { getPool, sql } = require('../config/db');

const assignmentsController = {

  // GET /api/assignments?userId=43
  // Admin/Manager: list all assignments or filter by userId
  async getAll(req, res) {
    const pool = await getPool();
    const { userId } = req.query;

    let query = `
      SELECT
        ia.AssignmentId,
        ia.UserId,
        ud.Username,
        ud.FirstName + ' ' + ud.LastName AS FullName,
        ia.AircraftId,
        a.MSN,
        a.Registration,
        a.AircraftType,
        ia.AssignedDate,
        ia.Delmark
      FROM dbo.InspectorAircraftAssignment ia
      INNER JOIN dbo.UsersDetail ud ON ud.UserId = ia.UserId
      INNER JOIN dbo.Aircraft    a  ON a.AircraftId = ia.AircraftId
      WHERE ia.Delmark = 'N'
    `;

    const request = pool.request();
    if (userId) {
      query += ' AND ia.UserId = @userId';
      request.input('userId', sql.Int, parseInt(userId, 10));
    }
    query += ' ORDER BY ud.Username, a.MSN';

    const result = await request.query(query);
    res.json(result.recordset);
  },

  // POST /api/assignments
  // Body: { userId, aircraftIds: [1,2,3] }  — replaces the inspector's entire assignment list
  async assign(req, res) {
    const { userId, aircraftIds } = req.body;

    if (!userId || !Array.isArray(aircraftIds)) {
      return res.status(400).json({ error: { message: 'userId and aircraftIds[] are required' } });
    }

    const pool = await getPool();

    // Soft-delete all existing assignments for this inspector
    await pool.request()
      .input('userId', sql.Int, parseInt(userId, 10))
      .query(`UPDATE dbo.InspectorAircraftAssignment SET Delmark = 'Y' WHERE UserId = @userId`);

    // Re-insert or re-activate requested aircraft
    for (const aircraftId of aircraftIds) {
      await pool.request()
        .input('userId',     sql.Int, parseInt(userId, 10))
        .input('aircraftId', sql.Int, parseInt(aircraftId, 10))
        .input('assignedBy', sql.Int, req.user.userId)
        .query(`
          MERGE dbo.InspectorAircraftAssignment AS target
          USING (SELECT @userId AS UserId, @aircraftId AS AircraftId) AS src
            ON target.UserId = src.UserId AND target.AircraftId = src.AircraftId
          WHEN MATCHED THEN
            UPDATE SET Delmark = 'N', AssignedBy = @assignedBy, AssignedDate = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (UserId, AircraftId, AssignedBy) VALUES (@userId, @aircraftId, @assignedBy);
        `);
    }

    res.json({ message: `Assigned ${aircraftIds.length} aircraft to user ${userId}` });
  },

  // DELETE /api/assignments/:assignmentId  — remove a single assignment
  async remove(req, res) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(`UPDATE dbo.InspectorAircraftAssignment SET Delmark = 'Y' WHERE AssignmentId = @id`);
    res.json({ message: 'Assignment removed' });
  },
};

module.exports = assignmentsController;
