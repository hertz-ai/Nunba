# Regional Deployment: JWT Authentication Migration Guide

Starting with HARTOS v0.1.0, regional tier deployments (`HEVOLVE_NODE_TIER=regional`) require JWT authentication for the `/chat` endpoint. Body-sourced `user_id` is no longer accepted on multi-user tiers.

## What Changed

Previously, any client could POST to `/chat` with a `user_id` in the request body without authentication. This allowed user impersonation on multi-user LAN deployments. Now:

| Tier | Auth required for /chat | Body user_id |
|------|------------------------|--------------|
| `flat` (desktop, default) | No | Accepted |
| `regional` (LAN) | Yes (JWT) | Rejected → 401 |
| `central` (cloud) | Yes (JWT) | Rejected → 401 |

## Migration Steps

### 1. Set SECRET_KEY

Generate a secure random key and set it as an environment variable:

```bash
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
```

HARTOS will log an ERROR at boot if `HEVOLVE_NODE_TIER=regional` but no `SECRET_KEY` is configured.

### 2. Configure HEVOLVE_NODE_TIER

```bash
export HEVOLVE_NODE_TIER=regional
```

If this env var is not set, HARTOS defaults to `flat` (no auth required).

### 3. Register Users and Obtain JWT

Users must register via the social auth API:

```bash
# Register
curl -X POST http://<host>:5000/api/social/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "secure_password"}'

# Login (returns JWT)
curl -X POST http://<host>:5000/api/social/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "secure_password"}'
# Response: {"success": true, "data": {"token": "eyJ...", "user": {...}}}
```

### 4. Update Client Configuration

All clients must send the JWT in the Authorization header:

```bash
curl -X POST http://<host>:5000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJ..." \
  -d '{"prompt": "hello", "prompt_id": null}'
```

The `user_id` field in the body is ignored when a valid JWT is present — the JWT's `user_id` claim is used instead.

### 5. Verify

After migration, test:

```bash
# Should succeed (with JWT)
curl -X POST http://<host>:5000/chat \
  -H "Authorization: Bearer <token>" \
  -d '{"prompt": "test", "prompt_id": null}' -w "%{http_code}"
# → 200

# Should fail (no JWT, body user_id only)
curl -X POST http://<host>:5000/chat \
  -d '{"user_id": "1", "prompt": "test", "prompt_id": null}' -w "%{http_code}"
# → 401
```

## Escape Hatch

If you need to temporarily disable auth enforcement while migrating clients:

```bash
export HEVOLVE_NODE_TIER=flat
```

This accepts body-sourced `user_id` without auth. **Not recommended for multi-user deployments** as it allows user impersonation.

## Monitoring

After migration, watch for these log entries:

- `WARNING: /chat user_id mismatch: body=X jwt=Y` — a client is still sending body user_id alongside JWT. The JWT value is used, body value is dropped.
- `WARNING: HEVOLVE_NODE_TIER not set` — deployment is running without explicit tier configuration.
- `ERROR: HEVOLVE_NODE_TIER=regional but no SECRET_KEY` — JWT auth will reject ALL requests.
