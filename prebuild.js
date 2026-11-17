const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        results.push(full);
        results = results.concat(walk(full));
      }
    });
  } catch (e) {}
  return results;
}

const appDirs = walk('app');
const bases = [
  path.join('.next', 'server', 'app'),
  path.join('.next', 'static', 'chunks', 'app'),
  path.join('.next', 'types', 'app'),
];

const extraDirs = [
  path.join('.next', 'static', 'chunks', 'next', 'dist'),
  path.join('.next', 'static', 'chunks', 'next', 'dist', 'client'),
  path.join('.next', 'static', 'chunks', 'next', 'dist', 'client', 'components'),
  path.join('.next', 'static', 'chunks', 'next', 'dist', 'compiled'),
  path.join('.next', 'server', 'chunks'),
  path.join('.next', 'server', 'vendor-chunks'),
  path.join('.next', 'server', 'app', '_global-error.segments', '_global-error'),
];

extraDirs.forEach((d) => {
  if (!fs.existsSync(d)) {
    try { fs.mkdirSync(d, { recursive: true }); } catch (e) {}
  }
});

appDirs.forEach((dir) => {
  const rel = path.relative('app', dir);
  bases.forEach((base) => {
    const target = path.join(base, rel);
    if (!fs.existsSync(target)) {
      try { fs.mkdirSync(target, { recursive: true }); } catch (e) {}
    }
  });
});
