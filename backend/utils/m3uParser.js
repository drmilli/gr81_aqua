// Minimal M3U parser: extracts channel name, logo and URL from #EXTINF lines
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const entries = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      // Example: #EXTINF:-1 tvg-id="" tvg-name="BBC One" tvg-logo="http://logo" group-title="News",BBC One
      const meta = line.substring('#EXTINF:'.length);
      const nameMatch = /,(.*)$/.exec(line);
      const name = nameMatch ? nameMatch[1].trim() : 'Channel';
      const logoMatch = /tvg-logo=\"([^\"]*)\"/.exec(line);
      const groupMatch = /group-title=\"([^\"]*)\"/.exec(line);
      current = {
        name,
        logoUrl: logoMatch ? logoMatch[1] : null,
        category: groupMatch ? groupMatch[1] : null,
      };
    } else if (current && line && !line.startsWith('#')) {
      entries.push({ ...current, hlsUrl: line.trim() });
      current = null;
    }
  }
  return entries;
}

module.exports = { parseM3U };
