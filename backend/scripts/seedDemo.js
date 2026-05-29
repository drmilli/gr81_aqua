require('dotenv').config();
const { sequelize, Provider, TVChannel, Movie, Series, Episode } = require('../models');

async function main() {
  try {
    await sequelize.authenticate();
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync();
    }

    // Provider
    let provider = await Provider.findOne({ where: { code: 'demo' } });
    if (!provider) {
      provider = await Provider.create({ code: 'demo', name: 'Demo Provider' });
      console.log('Created provider:', provider.code);
    }

    // TV Channels
    const channels = [
      { name: 'Demo News', category: 'News', hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
      { name: 'Demo Sports', category: 'Sports', hlsUrl: 'https://test-streams.mux.dev/ptsv-uhd/playlist.m3u8' },
    ];
    for (const ch of channels) {
      const [row] = await TVChannel.findOrCreate({
        where: { providerId: provider.id, name: ch.name },
        defaults: { ...ch, providerId: provider.id },
      });
      console.log('Ensured channel:', row.name);
    }

    // Movies
    const movies = [
      { title: 'Demo Movie 1', hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', category: 'Action' },
      { title: 'Demo Movie 2', hlsUrl: 'https://test-streams.mux.dev/ptsv-uhd/playlist.m3u8', category: 'Drama' },
    ];
    for (const m of movies) {
      const [row] = await Movie.findOrCreate({
        where: { title: m.title },
        defaults: { ...m, providerId: provider.id },
      });
      console.log('Ensured movie:', row.title);
    }

    // Series + Episodes
    const [series] = await Series.findOrCreate({
      where: { title: 'Demo Series' },
      defaults: { description: 'A sample series', providerId: provider.id },
    });
    if (Episode) {
      await Episode.findOrCreate({
        where: { seriesId: series.id, season: 1, episodeNumber: 1, title: 'Pilot' },
        defaults: { hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
      });
      console.log('Ensured episode: Demo Series S1E1');
    }

    console.log('Demo seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

main();
