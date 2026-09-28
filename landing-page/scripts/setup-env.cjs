#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const PROJECT_DIR = path.dirname(SCRIPT_DIR);
const SHELL_SCRIPT = path.join(SCRIPT_DIR, 'setup-env.sh');

function existingFile(candidate) {
  return candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ? candidate
    : null;
}

function commandOnPath(command, env = process.env) {
  const probe = spawnSync(command, ['--version'], {
    env,
    encoding: 'utf8',
    windowsHide: true,
  });
  return !probe.error && probe.status === 0 ? command : null;
}

function gitInstallRoots(env) {
  const roots = [];
  for (const base of [env.ProgramFiles, env['ProgramFiles(x86)'], env.LocalAppData]) {
    if (!base) continue;
    roots.push(base === env.LocalAppData
      ? path.join(base, 'Programs', 'Git')
      : path.join(base, 'Git'));
  }
  return roots;
}

function resolveBash(env = process.env) {
  if (existingFile(env.NUNBA_BASH)) return env.NUNBA_BASH;
  if (commandOnPath('bash', env)) return 'bash';
  if (process.platform !== 'win32') return null;

  for (const root of gitInstallRoots(env)) {
    for (const relative of [['bin', 'bash.exe'], ['usr', 'bin', 'bash.exe']]) {
      const candidate = existingFile(path.join(root, ...relative));
      if (candidate) return candidate;
    }
  }
  return null;
}

function resolveOpenSsl(env = process.env) {
  if (existingFile(env.NUNBA_OPENSSL)) return env.NUNBA_OPENSSL;
  if (commandOnPath('openssl', env)) return 'openssl';
  if (process.platform !== 'win32') return null;

  for (const root of gitInstallRoots(env)) {
    for (const relative of [
      ['usr', 'bin', 'openssl.exe'],
      ['mingw64', 'bin', 'openssl.exe'],
      ['mingw32', 'bin', 'openssl.exe'],
    ]) {
      const candidate = existingFile(path.join(root, ...relative));
      if (candidate) return candidate;
    }
  }
  return null;
}

function runPortable(env = process.env) {
  const envProduction = path.join(PROJECT_DIR, '.env.production');
  const envEncrypted = path.join(PROJECT_DIR, '.env.production.enc');
  const envLocal = path.join(PROJECT_DIR, '.env.local');
  const envExample = path.join(PROJECT_DIR, '.env.example');

  if (fs.existsSync(envEncrypted) && env.NUNBA_ENV_KEY) {
    const openssl = resolveOpenSsl(env);
    if (!openssl) {
      console.error('[setup-env] Cannot decrypt .env.production.enc: OpenSSL was not found.');
      return 1;
    }
    console.log('[setup-env] Decrypting .env.production from encrypted file...');
    const result = spawnSync(openssl, [
      'enc', '-aes-256-cbc', '-d', '-pbkdf2',
      '-in', envEncrypted,
      '-out', envProduction,
      '-pass', `pass:${env.NUNBA_ENV_KEY}`,
    ], { env, stdio: 'inherit', windowsHide: true });
    if (result.error) {
      console.error(`[setup-env] Failed to start OpenSSL: ${result.error.message}`);
      return 1;
    }
    if (result.status !== 0) return result.status === null ? 1 : result.status;
    console.log('[setup-env] .env.production created successfully.');
    return 0;
  }

  if (fs.existsSync(envProduction)) {
    console.log('[setup-env] .env.production already exists, skipping.');
    return 0;
  }
  if (fs.existsSync(envLocal)) {
    console.log('[setup-env] .env.local already exists, skipping.');
    return 0;
  }
  if (fs.existsSync(envExample)) {
    console.log('[setup-env] No env file found. Copying .env.example to .env.local');
    console.log('[setup-env] Edit .env.local to configure your environment.');
    fs.copyFileSync(envExample, envLocal);
    return 0;
  }

  console.warn('[setup-env] Warning: No .env.example found. Create one or set NUNBA_ENV_KEY.');
  return 0;
}

function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.includes('--portable') || env.NUNBA_SETUP_ENV_FORCE_PORTABLE === '1') {
    return runPortable(env);
  }

  const bash = resolveBash(env);
  if (!bash) {
    console.log('[setup-env] Bash was not found; using the portable setup.');
    return runPortable(env);
  }

  console.log(`[setup-env] Using Bash: ${bash}`);
  const result = spawnSync(bash, [SHELL_SCRIPT], {
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) {
    console.warn(`[setup-env] Bash could not be started (${result.error.message}); using the portable setup.`);
    return runPortable(env);
  }
  if (result.status !== 0) {
    const status = result.status === null ? 'without an exit code' : `with exit code ${result.status}`;
    console.warn(`[setup-env] Bash exited ${status}; using the portable setup.`);
    return runPortable(env);
  }
  return 0;
}

module.exports = { main, resolveBash, resolveOpenSsl, runPortable };

if (require.main === module) {
  process.exitCode = main();
}
