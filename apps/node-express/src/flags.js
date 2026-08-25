const db = require('./db');

const FLAG_ENV_PREFIX = 'FLAG_';

function seedFlagsFromEnv() {
  const upsert = db.prepare(`
    INSERT INTO flags (vuln_id, flag_value)
    VALUES (?, ?)
    ON CONFLICT(vuln_id) DO UPDATE SET flag_value = excluded.flag_value
  `);

  let count = 0;
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(FLAG_ENV_PREFIX) || !value) continue;
    const vulnId = key.slice(FLAG_ENV_PREFIX.length);
    upsert.run(vulnId, value);
    count += 1;
  }
  return count;
}

module.exports = { seedFlagsFromEnv };
