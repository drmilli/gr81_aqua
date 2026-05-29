const axios = require('axios');
const { Provider, TVChannel, EPGEvent } = require('../models');
const { parseM3U } = require('../utils/m3uParser');
const { parseXMLTV } = require('../utils/xmltvParser');

async function createProvider(req, res, next) {
  try {
    const { code, name, m3uUrl = null, xtreamUrl = null, xtreamUsername = null, xtreamPassword = null, xmltvUrl = null } = req.body || {};
    if (!code || !name) {
      res.status(400);
      return next(new Error('code and name are required'));
    }
    const existing = await Provider.findOne({ where: { code } });
    if (existing) {
      res.status(409);
      return next(new Error('Provider code already exists'));
    }
    const provider = await Provider.create({ code, name, m3uUrl, xtreamUrl, xtreamUsername, xtreamPassword, xmltvUrl });
    res.status(201).json(provider);
  } catch (err) { next(err); }
}

async function updateProvider(req, res, next) {
  try {
    const { id } = req.params;
    const { name, m3uUrl, xtreamUrl, xtreamUsername, xtreamPassword, xmltvUrl } = req.body || {};
    const provider = await Provider.findByPk(id);
    if (!provider) { res.status(404); return next(new Error('Provider not found')); }
    if (name !== undefined)            provider.name = name;
    if (m3uUrl !== undefined)          provider.m3uUrl = m3uUrl || null;
    if (xtreamUrl !== undefined)       provider.xtreamUrl = xtreamUrl || null;
    if (xtreamUsername !== undefined)  provider.xtreamUsername = xtreamUsername || null;
    if (xtreamPassword !== undefined)  provider.xtreamPassword = xtreamPassword || null;
    if (xmltvUrl !== undefined)        provider.xmltvUrl = xmltvUrl || null;
    await provider.save();
    res.json(provider);
  } catch (err) { next(err); }
}

async function listProviders(req, res, next) {
  try {
    const providers = await Provider.findAll({ order: [['createdAt', 'DESC']] });
    res.json(providers);
  } catch (err) { next(err); }
}

async function ingestM3U(req, res, next) {
  try {
    const { id } = req.params;
    const provider = await Provider.findByPk(id);
    if (!provider) { res.status(404); return next(new Error('Provider not found')); }
    const url = req.body?.url || provider.m3uUrl;
    if (!url) { res.status(400); return next(new Error('url is required (or set provider.m3uUrl)')); }
    const resp = await axios.get(url, { responseType: 'text' });
    const entries = parseM3U(resp.data);
    let created = 0;
    for (const e of entries) {
      // upsert by (providerId, name, hlsUrl)
      const [row, isCreated] = await TVChannel.findOrCreate({
        where: { providerId: provider.id, name: e.name, hlsUrl: e.hlsUrl },
        defaults: { logoUrl: e.logoUrl || null, category: e.category || null },
      });
      if (!isCreated) {
        row.logoUrl = e.logoUrl || row.logoUrl;
        row.category = e.category || row.category;
        await row.save();
      } else {
        created += 1;
      }
    }
    res.json({ imported: entries.length, created });
  } catch (err) { next(err); }
}

async function ingestXMLTV(req, res, next) {
  try {
    const { id } = req.params;
    const provider = await Provider.findByPk(id);
    if (!provider) { res.status(404); return next(new Error('Provider not found')); }
    const url = req.body?.url || provider.xmltvUrl;
    if (!url) { res.status(400); return next(new Error('url is required (or set provider.xmltvUrl)')); }
    const resp = await axios.get(url, { responseType: 'text' });
    const { channels, events } = await parseXMLTV(resp.data);

    // Map EPG channel IDs to our TVChannels by epgId or name match
    const tvChannels = await TVChannel.findAll({ where: { providerId: provider.id } });
    const byEpg = new Map();
    const byName = new Map();
    for (const ch of tvChannels) {
      if (ch.epgId) byEpg.set(ch.epgId, ch);
      byName.set((ch.name || '').toLowerCase(), ch);
    }

    let inserted = 0;
    for (const ev of events) {
      let ch = byEpg.get(ev.epgChannelId);
      if (!ch) {
        const displayName = channels.get(ev.epgChannelId) || '';
        ch = byName.get(displayName.toLowerCase());
      }
      if (!ch) continue; // no matching channel
      await EPGEvent.create({ channelId: ch.id, title: ev.title, summary: ev.summary, startsAt: ev.startsAt, endsAt: ev.endsAt });
      inserted += 1;
    }

    res.json({ eventsParsed: events.length, eventsInserted: inserted, channelsMatched: tvChannels.length });
  } catch (err) { next(err); }
}

module.exports = { createProvider, updateProvider, listProviders, ingestM3U, ingestXMLTV };
