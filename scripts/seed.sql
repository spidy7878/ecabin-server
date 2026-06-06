-- ──────────────────────────────────────────────────────────────────────────────
-- eCabin test-data seed  (idempotent — safe to re-run)
-- Inspector: inspector.john / Test@1234
-- Aircraft:  AircraftId=2 (VT-AXJ, B737-800)  →  Due Soon  (+12 days)
--            AircraftId=3 (VT-AXI, B737-800)  →  Overdue   (-5 days)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Ensure test inspector exists with correct password hash and Organisation='2'
--    Passwords are stored as plain text in this database.
IF EXISTS (SELECT 1 FROM dbo.UsersDetail WHERE Username = 'inspector.john')
BEGIN
    UPDATE dbo.UsersDetail
    SET Organisation = '2',
        FirstName    = 'John',
        LastName     = 'Smith',
        Role         = 'User',
        Delmark      = 'N',
        Password     = 'Test@1234'
    WHERE Username = 'inspector.john';
END
ELSE
BEGIN
    INSERT INTO dbo.UsersDetail
        (FirstName, LastName, Email, Username, Password, Role, Organisation, Delmark, CreatedDate)
    VALUES
        ('John', 'Smith', 'john.smith.test@ecabin.local', 'inspector.john',
         'Test@1234', 'User', '2', 'N', GETDATE());
END

-- 2. Remove stale test audit rows for this inspector (so re-runs are clean)
DELETE FROM dbo.AircraftAudits
WHERE LOWER(LastAuditPerson) = 'john smith'
  AND AircraftId IN (2, 3);

-- 3. Insert audit tasks for the two test aircraft
--    AircraftId=2 (VT-AXJ): Due Soon  — NextAuditDate = today + 12 days
INSERT INTO dbo.AircraftAudits
    (AircraftId, LastAuditDate, LastAuditBase, LastAuditPerson,
     IssuesReported, ExistingIssues, AuditInterval, NextAuditDate, Delmark)
VALUES
    (2, CAST(DATEADD(day, -90, GETDATE()) AS DATE), 'BOM', 'John Smith',
     3, 1, 90, CAST(DATEADD(day, 12, GETDATE()) AS DATE), 'N');

--    AircraftId=3 (VT-AXI): Overdue  — NextAuditDate = today - 5 days
INSERT INTO dbo.AircraftAudits
    (AircraftId, LastAuditDate, LastAuditBase, LastAuditPerson,
     IssuesReported, ExistingIssues, AuditInterval, NextAuditDate, Delmark)
VALUES
    (3, CAST(DATEADD(day, -95, GETDATE()) AS DATE), 'DEL', 'John Smith',
     7, 2, 90, CAST(DATEADD(day, -5, GETDATE()) AS DATE), 'N');

SELECT 'Seed complete' AS Result,
       (SELECT UserId FROM dbo.UsersDetail WHERE Username = 'inspector.john') AS InspectorUserId,
       (SELECT COUNT(*) FROM dbo.AircraftAudits WHERE LOWER(LastAuditPerson) = 'john smith' AND AircraftId IN (2,3)) AS AuditRowsInserted;
