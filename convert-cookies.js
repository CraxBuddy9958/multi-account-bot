// convert-cookies.js
// Usage: node convert-cookies.js cookies-export.json > cleaned-cookies.json

const fs = require('fs');

if (process.argv.length < 3) {
  console.error('Usage: node convert-cookies.js cookies-export.json');
  process.exit(2);
}

const inFile = process.argv[2];
const raw = fs.readFileSync(inFile, 'utf8');
const arr = JSON.parse(raw);

const out = arr.map(c => {
  const o = {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
  };
  if (c.expirationDate !== undefined) {
    // make integer seconds
    o.expires = Math.floor(Number(c.expirationDate));
  }
  if (c.httpOnly !== undefined) o.httpOnly = !!c.httpOnly;
  if (c.secure !== undefined) o.secure = !!c.secure;
  if (c.sameSite) {
    // normalize common values
    const s = String(c.sameSite).toLowerCase();
    if (s === 'lax') o.sameSite = 'Lax';
    else if (s === 'strict') o.sameSite = 'Strict';
    else o.sameSite = 'None';
  }
  return o;
});

console.log(JSON.stringify(out, null, 2));
