const multer          = require('multer');
const path            = require('path');
const fs              = require('fs');
const crypto          = require('crypto');
const { getPool, sql } = require('../config/db');

// ── Disk storage — keeps a local file backup even after DB insert ─────────────
// Images land in  server/uploads/<zone_type>/<YYYY-MM-DD>/
// Filename:  <inspectorId>_<aircraftId>_<uuid>.<ext>

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const zoneType = (req.body.zone_type || 'misc').replace(/[^a-z]/gi, '');
    const dateStr  = new Date().toISOString().slice(0, 10);
    const dir      = path.join(__dirname, '../../uploads', zoneType, dateStr);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const inspectorId = req.user?.userId ?? 'unknown';
    const aircraftId  = req.body.aircraft_id ?? '0';
    const ext         = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uid         = crypto.randomBytes(8).toString('hex');
    cb(null, `${inspectorId}_${aircraftId}_${uid}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per image
  fileFilter(_req, file, cb) {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

// ── Zone → table mapping ──────────────────────────────────────────────────────
// Each defect-record table has the same shape; only the zone column name and
// whether SubCatId exists differs.

const ZONE_MAP = {
  seats:     { table: 'CabinDefectRecords',          zoneCol: 'SeatNo',          hasSubCatId: true  },
  galley:    { table: 'GalleyDefectRecords',          zoneCol: 'GalleyNo',        hasSubCatId: false },
  lavatory:  { table: 'LavatoriesDefectRecords',      zoneCol: 'LavatoriesNo',    hasSubCatId: false },
  attendant: { table: 'AttendantSeatDefectRecords',   zoneCol: 'AttendantSeatNo', hasSubCatId: false },
};

// ── Controller ────────────────────────────────────────────────────────────────

const inspectionsController = {
  upload: upload.single('image'),

  async uploadImage(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No image file received' } });
    }

    const {
      aircraft_msn,
      zone_type,
      zone_id,
      zone_name,
      part_id,
      part_name,
      issue_id,
      issue_name,
      satisfaction,
      remarks,
      client_id,
    } = req.body;

    const zoneConfig = ZONE_MAP[zone_type];
    if (!zoneConfig) {
      return res.status(400).json({ error: { message: `Unknown zone_type: ${zone_type}` } });
    }

    // Fix 4: Validate aircraft_id exists in the Aircraft table.
    // Prevents uploads being attached to non-existent or wrong aircraft.
    if (!req.body.aircraft_id) {
      return res.status(400).json({ error: { message: 'aircraft_id is required' } });
    }
    {
      const checkPool = await getPool();
      const checkResult = await checkPool.request()
        .input('aid', sql.Int, parseInt(req.body.aircraft_id, 10))
        .query(`SELECT 1 AS found FROM dbo.Aircraft WHERE AircraftId = @aid AND IsActive = 1`);
      if (!checkResult.recordset[0]) {
        return res.status(400).json({ error: { message: `Aircraft ${req.body.aircraft_id} not found or inactive` } });
      }
    }

    // Build the public URL for serving the image (also stored in ProofImagePath)
    const relPath  = req.file.path
      .replace(path.join(__dirname, '../../'), '')
      .replace(/\\/g, '/');
    const serverUrl = `${req.protocol}://${req.get('host')}/${relPath}`;
    const now = new Date();

    try {
      const pool = await getPool();

      // ── satisfied inspection: file saved locally, no defect record needed ──
      if (satisfaction === '1' || satisfaction === 1) {
        return res.status(201).json({
          serverId:   null,
          clientId:   client_id ?? null,
          url:        serverUrl,
          fileName:   req.file.filename,
          size:       req.file.size,
          uploadedAt: now.toISOString(),
        });
      }

      // ── defect found: resolve PartID ────────────────────────────────────────
      // Prefer part_id sent by client; fall back to lookup by part_name.
      let resolvedPartId = part_id ? parseInt(part_id, 10) : null;
      if (!resolvedPartId && part_name) {
        const lr = await pool.request()
          .input('pname', sql.NVarChar(200), part_name)
          .query(`SELECT TOP 1 PartID FROM dbo.Parts WHERE PartName = @pname`);
        resolvedPartId = lr.recordset[0]?.PartID ?? null;
      }
      if (!resolvedPartId) {
        return res.status(400).json({ error: { message: `Part not found: "${part_name}"` } });
      }

      const resolvedIssueId = issue_id ? parseInt(issue_id, 10) : null;
      if (!resolvedIssueId) {
        return res.status(400).json({ error: { message: 'issue_id is required for defects' } });
      }

      // ── INSERT into the zone-specific defect table ─────────────────────────
      const imageBuffer   = fs.readFileSync(req.file.path);
      const inspectorName = req.user?.fullName ?? 'Unknown';
      const noteText = [
        part_name  ? `Part: ${part_name}`   : null,
        issue_name ? `Issue: ${issue_name}` : null,
        remarks    || null,
      ].filter(Boolean).join(' | ') || null;

      const dbReq = pool.request();
      dbReq.input('msn',        sql.NVarChar(20),         aircraft_msn    ?? null);
      dbReq.input('zoneNo',     sql.NVarChar(20),         zone_name       ?? null);
      dbReq.input('partId',     sql.Int,                  resolvedPartId);
      dbReq.input('issueId',    sql.Int,                  resolvedIssueId);
      dbReq.input('issueNote',  sql.NVarChar(sql.MAX),    noteText);
      dbReq.input('imagePath',  sql.NVarChar(500),        serverUrl);
      dbReq.input('status',     sql.NVarChar(50),         'Defect Found');
      dbReq.input('priority',   sql.NVarChar(50),         'Normal');
      dbReq.input('imageName',  sql.NVarChar(200),        req.file.filename);
      dbReq.input('imageData',  sql.VarBinary(sql.MAX),   imageBuffer);
      dbReq.input('contentType',sql.NVarChar(50),         req.file.mimetype);
      dbReq.input('defectUser', sql.VarChar(50),          inspectorName.substring(0, 50));
      dbReq.input('now',        sql.DateTime2,            now);
      dbReq.input('delmark',    sql.Char(1),              'N');

      const { table, zoneCol, hasSubCatId } = zoneConfig;

      const subCatSql = hasSubCatId ? ', SubCatId' : '';
      const subCatVal = hasSubCatId ? ', @subCatId' : '';
      if (hasSubCatId) {
        dbReq.input('subCatId', sql.NVarChar(50), zone_id ? String(zone_id) : null);
      }

      const result = await dbReq.query(`
        INSERT INTO ${table} (
          MSN, ${zoneCol}, PartID, IssueID, IssueNote,
          ProofImagePath, Status, Priority,
          ImageName, ImageData, ContentType,
          DefectUser, RecordDate, CreatedBy, CreatedDate, Delmark
          ${subCatSql}
        )
        OUTPUT INSERTED.RecordID
        VALUES (
          @msn, @zoneNo, @partId, @issueId, @issueNote,
          @imagePath, @status, @priority,
          @imageName, @imageData, @contentType,
          @defectUser, @now, @defectUser, @now, @delmark
          ${subCatVal}
        )
      `);

      const serverId = result.recordset[0]?.RecordID ?? null;

      res.status(201).json({
        serverId,
        clientId:   client_id ?? null,
        url:        serverUrl,
        fileName:   req.file.filename,
        size:       req.file.size,
        uploadedAt: now.toISOString(),
      });
    } catch (err) {
      // File already saved to disk — don't delete it so the queue can retry
      console.error('[inspections] DB insert failed:', err.message);
      return res.status(500).json({ error: { message: err.message ?? 'DB insert failed' } });
    }
  },
};

module.exports = inspectionsController;
