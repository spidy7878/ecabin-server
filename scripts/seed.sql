-- ──────────────────────────────────────────────────────────────────────────────
-- eCabin test-data seed  (idempotent — safe to re-run)
--
-- Creates a single test INSPECTOR and assigns dummy aircraft to them via
-- dbo.InspectionDet — the inspector→aircraft assignment table the app reads.
-- (InspectionDet.AircraftId stores the aircraft MSN, not the Aircraft PK.)
--
--   Login:  testinspector / Test@1234     (Role = 'User')
--   Assigned aircraft:
--     • MSN 36325  VT-AXJ  (AircraftId 2)  → Overdue
--     • MSN 36326  VT-AXM  (AircraftId 4)  → Due Soon
--     • MSN 36327  VT-AXN  (AircraftId 5)  → Upcoming
--
-- Only inspectors (Role 'User') can sign into the app, so this is the only
-- account type the seed creates.
-- ──────────────────────────────────────────────────────────────────────────────
SET NOCOUNT ON;

-- 0. Remove the retired "John Smith / inspector.john" dummy data, if present.
DELETE FROM dbo.AircraftAudits WHERE LOWER(LastAuditPerson) = 'john smith';
DECLARE @johnId INT = (SELECT UserId FROM dbo.UsersDetail WHERE Username = 'inspector.john');
IF @johnId IS NOT NULL
BEGIN
    DELETE FROM dbo.InspectionDet WHERE UserID = @johnId;
    DELETE FROM dbo.UsersDetail   WHERE UserId = @johnId;
END

-- 1. Ensure the test inspector exists (passwords are stored as plain text here).
IF EXISTS (SELECT 1 FROM dbo.UsersDetail WHERE Username = 'testinspector')
BEGIN
    UPDATE dbo.UsersDetail
       SET FirstName = 'Test', LastName = 'Inspector',
           Email = 'testinspector@ecabin.local',
           Password = 'Test@1234', Role = 'User',
           Organisation = '2', Delmark = 'N'
     WHERE Username = 'testinspector';
END
ELSE
BEGIN
    INSERT INTO dbo.UsersDetail
        (FirstName, LastName, Email, Username, EmployeeID, Password, Role, Organisation, Delmark, CreatedDate)
    VALUES
        ('Test', 'Inspector', 'testinspector@ecabin.local', 'testinspector', 'TEST-001',
         'Test@1234', 'User', '2', 'N', GETDATE());
END

DECLARE @uid INT = (SELECT UserId FROM dbo.UsersDetail WHERE Username = 'testinspector');

-- 2. Reset this inspector's dummy assignments + audits so re-runs stay clean.
DELETE FROM dbo.InspectionDet  WHERE UserID = @uid;
DELETE FROM dbo.AircraftAudits WHERE LOWER(LastAuditPerson) = 'test inspector' AND AircraftId IN (2, 4, 5);

-- 3. Assign 3 aircraft to the inspector (InspectionDet.AircraftId = MSN).
INSERT INTO dbo.InspectionDet
    (UserID, AircraftId, InspectionDate, InspectionBase, InspectionStatus, InspectionDelmark, OperatorId)
VALUES
    (@uid, 36325, CAST(GETDATE() AS DATE), '1', 'Pending', 'N', '2'),
    (@uid, 36326, CAST(GETDATE() AS DATE), '1', 'Pending', 'N', '2'),
    (@uid, 36327, CAST(GETDATE() AS DATE), '1', 'Pending', 'N', '2');

-- 4. Matching audit-schedule rows so the Home dashboard shows real tasks/stats.
INSERT INTO dbo.AircraftAudits
    (AircraftId, LastAuditDate, LastAuditBase, LastAuditPerson,
     IssuesReported, ExistingIssues, AuditInterval, NextAuditDate, Delmark)
VALUES
    (2, CAST(DATEADD(day, -95, GETDATE()) AS DATE), 'BOM', 'Test Inspector',
     7, 2, 90, CAST(DATEADD(day, -5, GETDATE()) AS DATE), 'N'),   -- Overdue
    (4, CAST(DATEADD(day, -90, GETDATE()) AS DATE), 'BOM', 'Test Inspector',
     3, 1, 90, CAST(DATEADD(day, 12, GETDATE()) AS DATE), 'N'),   -- Due Soon
    (5, CAST(DATEADD(day, -30, GETDATE()) AS DATE), 'DEL', 'Test Inspector',
     0, 0, 90, CAST(DATEADD(day, 60, GETDATE()) AS DATE), 'N');   -- Upcoming

SELECT 'Seed complete' AS Result,
       @uid AS TestInspectorUserId,
       (SELECT COUNT(*) FROM dbo.InspectionDet  WHERE UserID = @uid AND RTRIM(InspectionDelmark) = 'N') AS AssignedAircraft,
       (SELECT COUNT(*) FROM dbo.AircraftAudits WHERE LOWER(LastAuditPerson) = 'test inspector') AS AuditRows;
