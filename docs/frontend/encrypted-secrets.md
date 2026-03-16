# Encrypted Secrets

For private/internal builds, Nunba uses an encrypted environment file system. Production secrets (payment keys, Sentry DSN, analytics IDs) are stored encrypted in the git repository and decrypted automatically during `npm run build`.

## How It Works

```
.env.production          (plaintext, gitignored)
        ↕ encrypt/decrypt
.env.production.enc      (encrypted, committed to git)
```

- **Encryption**: AES-256-CBC with PBKDF2 key derivation (OpenSSL)
- **Passphrase**: Stored in the `NUNBA_ENV_KEY` environment variable
- **Auto-decrypt**: The `prebuild` npm hook runs `scripts/setup-env.sh` before every build

## Setup for Hevolve Team Members

### 1. Get the passphrase

Ask a team lead for the `NUNBA_ENV_KEY` passphrase.

### 2. Set the environment variable

=== "Windows (permanent)"

    ```powershell
    [System.Environment]::SetEnvironmentVariable('NUNBA_ENV_KEY', 'your-passphrase', 'User')
    ```

    Restart your terminal for it to take effect.

=== "Windows (session only)"

    ```bash
    export NUNBA_ENV_KEY="your-passphrase"
    ```

=== "macOS / Linux (permanent)"

    Add to `~/.bashrc` or `~/.zshrc`:
    ```bash
    export NUNBA_ENV_KEY="your-passphrase"
    ```

    Then: `source ~/.bashrc`

### 3. Build

```bash
cd landing-page
npm run build
```

The `prebuild` hook automatically decrypts `.env.production.enc` → `.env.production`.

## Updating Secrets

When you need to change a production secret:

### 1. Decrypt the current file

```bash
export NUNBA_ENV_KEY="your-passphrase"
cd landing-page
bash scripts/setup-env.sh
```

### 2. Edit `.env.production`

```bash
# Edit the file with your changes
nano .env.production   # or use any editor
```

### 3. Re-encrypt

```bash
npm run encrypt-env
# This runs: scripts/encrypt-env.sh
# Creates: .env.production.enc (overwritten)
```

### 4. Commit the encrypted file

```bash
git add .env.production.enc
git commit -m "Update production secrets"
```

## Setup for OSS Contributors

If you don't have the `NUNBA_ENV_KEY` passphrase (open source contributors):

1. The `prebuild` hook detects that `NUNBA_ENV_KEY` is not set
2. It copies `.env.example` → `.env.local` as a fallback
3. You get a working build with default (empty) values for optional services
4. Payment, Sentry, and Analytics features are simply disabled

No action needed — `npm run build` works out of the box.

## Script Reference

### `scripts/setup-env.sh`

Decision flow:

```
Has .env.production.enc AND NUNBA_ENV_KEY?
  → Yes: decrypt .env.production.enc → .env.production
  → No: Does .env.production exist?
    → Yes: skip (already set up)
    → No: Does .env.local exist?
      → Yes: skip (OSS contributor)
      → No: Copy .env.example → .env.local
```

### `scripts/encrypt-env.sh`

Requires `NUNBA_ENV_KEY` to be set. Encrypts `.env.production` → `.env.production.enc`.

## Security Notes

- `.env.production` is gitignored — never committed in plaintext
- `.env.production.enc` is committed — safe because it's AES-256 encrypted
- The passphrase is never stored in code or config files
- Each team member sets `NUNBA_ENV_KEY` in their own environment
- The encrypted file is deterministic — same input + passphrase = same output
