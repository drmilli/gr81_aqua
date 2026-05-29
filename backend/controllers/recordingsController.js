const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Recording } = require('../models');
const { computeStatus, getOrCreateLicense } = require('./licensingController');

const recordingsRoot = path.join(__dirname, '..', 'storage', 'recordings');
const active = new Map(); // recordingId -> ChildProcess

function getDeviceId(req) {
  const header = req.headers['x-device-id'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  return (fromHeader || req.query?.deviceId || req.body?.deviceId || '').toString().trim();
}

async function ensureAllowed(req) {
  const deviceId = getDeviceId(req);
  if (!deviceId) {
    const err = new Error('deviceId is required');
    err.status = 400;
    throw err;
  }
  const platform = (req.headers['x-platform'] || req.body?.platform || req.query?.platform || '').toString().trim() || null;
  const lic = await getOrCreateLicense({ deviceId, platform });
  const s = computeStatus(lic);
  if (!s.allowed) {
    const err = new Error('License not allowed');
    err.status = 403;
    err.reason = s.reason;
    throw err;
  }
  return { deviceId };
}

function safeName(s) {
  return String(s || '')
    .replace(/[^a-z0-9\-_]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'recording';
}

function absDownloadUrl(req, id) {
  const proto = req.headers['x-forwarded-proto'] ? String(req.headers['x-forwarded-proto']).split(',')[0] : req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/api/recordings/${encodeURIComponent(id)}/download`;
}

async function list(req, res, next) {
  try {
    const { deviceId } = await ensureAllowed(req);
    const rows = await Recording.findAll({ where: { deviceId }, order: [['createdAt', 'DESC']] });
    res.json(rows.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      format: r.format,
      fileName: r.fileName,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      error: r.error,
      downloadUrl: absDownloadUrl(req, r.id),
    })));
  } catch (e) {
    res.status(e.status || 500);
    next(e);
  }
}

async function start(req, res, next) {
  try {
    const { deviceId } = await ensureAllowed(req);
    const streamUrl = String(req.body?.streamUrl || '').trim();
    const title = String(req.body?.title || '').trim();
    if (!streamUrl) {
      res.status(400);
      return next(new Error('streamUrl is required'));
    }

    fs.mkdirSync(recordingsRoot, { recursive: true });
    const fileBase = `${safeName(title)}_${Date.now().toString(36)}`;
    const fileName = `${fileBase}.ts`;
    const filePath = path.join(recordingsRoot, fileName);

    const rec = await Recording.create({
      deviceId,
      title: title || 'Recording',
      streamUrl,
      status: 'recording',
      format: 'ts',
      fileName,
      filePath,
      startedAt: new Date(),
    });

    const args = [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5',
      '-headers', 'User-Agent: IPTVSmartersPlayer\r\nAccept: */*\r\n',
      '-i', streamUrl,
      '-c', 'copy', '-f', 'mpegts', filePath,
    ];
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    active.set(rec.id, child);

    child.on('error', async (err) => {
      try {
        active.delete(rec.id);
        await Recording.update({ status: 'failed', error: err.message, endedAt: new Date() }, { where: { id: rec.id } });
      } catch {}
    });

    let stderrBuf = '';
    child.stderr.on('data', (d) => {
      stderrBuf += d.toString();
      if (stderrBuf.length > 4000) stderrBuf = stderrBuf.slice(-4000);
    });

    child.on('exit', async (code, signal) => {
      try {
        active.delete(rec.id);
        const existing = await Recording.findByPk(rec.id);
        if (!existing) return;
        if (existing.status === 'recording') {
          const status = code === 0 || signal === 'SIGINT' ? 'finished' : 'failed';
          await existing.update({
            status,
            endedAt: new Date(),
            error: status === 'failed' ? (stderrBuf || `ffmpeg exited (${code || ''} ${signal || ''})`.trim()) : null,
          });
        }
      } catch {}
    });

    await rec.update({ pid: child.pid });

    res.status(201).json({
      id: rec.id,
      status: rec.status,
      downloadUrl: absDownloadUrl(req, rec.id),
    });
  } catch (e) {
    res.status(e.status || 500);
    next(e);
  }
}

async function stop(req, res, next) {
  try {
    const { deviceId } = await ensureAllowed(req);
    const id = String(req.params?.id || '').trim();
    if (!id) {
      res.status(400);
      return next(new Error('id is required'));
    }

    const rec = await Recording.findOne({ where: { id, deviceId } });
    if (!rec) {
      res.status(404);
      return next(new Error('Recording not found'));
    }

    if (rec.status !== 'recording') {
      return res.json({ id: rec.id, status: rec.status });
    }

    const child = active.get(rec.id);
    try {
      if (child && child.pid) process.kill(child.pid, 'SIGINT');
      else if (rec.pid) process.kill(rec.pid, 'SIGINT');
    } catch {}

    await rec.update({ status: 'stopped', endedAt: new Date() });

    setTimeout(() => {
      try {
        const c = active.get(rec.id);
        if (c && c.pid) process.kill(c.pid, 'SIGKILL');
        else if (rec.pid) process.kill(rec.pid, 'SIGKILL');
      } catch {}
    }, 2500);

    res.json({ id: rec.id, status: 'stopped' });
  } catch (e) {
    res.status(e.status || 500);
    next(e);
  }
}

async function download(req, res, next) {
  try {
    const { deviceId } = await ensureAllowed(req);
    const id = String(req.params?.id || '').trim();
    const rec = await Recording.findOne({ where: { id, deviceId } });
    if (!rec) {
      res.status(404);
      return next(new Error('Recording not found'));
    }
    if (!rec.filePath || !fs.existsSync(rec.filePath)) {
      res.status(404);
      return next(new Error('File not found'));
    }
    return res.download(rec.filePath, rec.fileName);
  } catch (e) {
    res.status(e.status || 500);
    next(e);
  }
}

module.exports = { list, start, stop, download };

