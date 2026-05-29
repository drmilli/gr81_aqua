const xml2js = require('xml2js');

async function parseXMLTV(xmlString) {
  const parser = new xml2js.Parser({ explicitArray: false });
  const doc = await parser.parseStringPromise(xmlString);
  const channels = new Map();
  const events = [];

  // Channels map: id -> display-name
  const ch = doc.tv?.channel;
  if (ch) {
    const chArr = Array.isArray(ch) ? ch : [ch];
    for (const c of chArr) {
      const id = c.$?.id;
      const name = typeof c['display-name'] === 'string' ? c['display-name'] : c['display-name']?.[0];
      if (id) channels.set(id, name || id);
    }
  }

  // Programmes
  const pg = doc.tv?.programme;
  if (pg) {
    const pgArr = Array.isArray(pg) ? pg : [pg];
    for (const p of pgArr) {
      const channelId = p.$?.channel;
      const title = typeof p.title === 'string' ? p.title : p.title?._ || p.title?.[0];
      const desc = typeof p.desc === 'string' ? p.desc : p.desc?._ || p.desc?.[0];
      const start = p.$?.start;
      const stop = p.$?.stop;
      const startsAt = parseXMLTVDate(start);
      const endsAt = parseXMLTVDate(stop);
      if (channelId && startsAt && endsAt && title) {
        events.push({ epgChannelId: channelId, title, summary: desc || null, startsAt, endsAt });
      }
    }
  }

  return { channels, events };
}

function parseXMLTVDate(s) {
  // format like 20240101T120000Z or 20240101120000 +0000
  if (!s) return null;
  const z = s.endsWith('Z') ? s : s.replace(/\s*[+\-]\d{4}$/, 'Z');
  const iso = z.replace(/^(\d{4})(\d{2})(\d{2})[T ]?(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z');
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = { parseXMLTV };
