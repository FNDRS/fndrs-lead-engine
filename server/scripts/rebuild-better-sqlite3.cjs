/**
 * Rebuild better-sqlite3 for the current Node ABI (fixes ERR_DLOPEN_FAILED after Node upgrades).
 * Invoked from server/package.json postinstall.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const serverRoot = path.join(__dirname, '..');

function main() {
  let pkgDir;
  try {
    const resolved = require.resolve('better-sqlite3/package.json', {
      paths: [serverRoot],
    });
    pkgDir = path.dirname(resolved);
  } catch {
    console.warn(
      '[postinstall] better-sqlite3 not found; skip native rebuild.',
    );
    return;
  }

  if (!fs.existsSync(path.join(pkgDir, 'binding.gyp'))) {
    console.warn('[postinstall] better-sqlite3 has no binding.gyp; skip.');
    return;
  }

  console.log('[postinstall] Rebuilding better-sqlite3 for this Node version…');
  execSync('npm run build-release', {
    cwd: pkgDir,
    stdio: 'inherit',
    env: process.env,
  });
}

try {
  main();
} catch (err) {
  console.error(
    '[postinstall] better-sqlite3 rebuild failed. Install build tools (Xcode CLT, python3) then run:\n' +
      '  cd server && node scripts/rebuild-better-sqlite3.cjs\n',
  );
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
