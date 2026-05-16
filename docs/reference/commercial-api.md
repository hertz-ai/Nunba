# Commercial API Reference

The Hevolve Commercial API exposes the same hive intelligence Nunba uses
locally, as a hosted HTTP service.  Free tier is always free — paid tiers
buy higher rate limits and priority routing.

**Base URL:** `https://hevolve.ai/api/v1/intelligence`

**Revenue split (committed in code, see `revenue_aggregator.py`):**

| Pool | Share | Where it goes |
|---|---|---|
| Users pool | 90% | Compute providers — the people who train the hive |
| Infrastructure | 9% | Hosting, edge nodes, bandwidth |
| Central | 1% | Hevolve AI Pvt Ltd (treasury, security, legal) |

## Tiers

| Tier | Monthly | Daily rate limit | Monthly tokens | Priority | Per-1K tokens |
|---|---|---|---|---|---|
| **Free** | $0 | 100 req | 3,000 | low | $0.00 |
| **Starter** | $9 | 1,000 req | 30,000 | normal | $0.50 |
| **Pro** | $49 | 10,000 req | 300,000 | high | $0.30 |
| **Enterprise** | $499 | 100,000 req | 10,000,000 | critical | $0.20 |

Free tier is free forever.  No credit card required.  Gatekeeping
intelligence is not the goal; sustaining the hive is.

## Discovery — public

### `GET /pricing`

Returns the live tier catalog + endpoint list + revenue split.  No auth.
Marketing agents + developer onboarding scripts should consult this rather
than hard-coding.

```bash
curl https://hevolve.ai/api/v1/intelligence/pricing
```

Response shape:

```json
{
  "success": true,
  "pricing_currency": "USD",
  "tiers": {
    "free":       { "monthly_price_usd": 0.0, "rate_limit_per_day": 100,    "monthly_quota_tokens": 3000,     "priority": "low",      "cost_per_1k_tokens_usd": 0.0 },
    "starter":    { "monthly_price_usd": 9.0, "rate_limit_per_day": 1000,   "monthly_quota_tokens": 30000,    "priority": "normal",   "cost_per_1k_tokens_usd": 0.5 },
    "pro":        { "monthly_price_usd": 49.0, "rate_limit_per_day": 10000, "monthly_quota_tokens": 300000,   "priority": "high",     "cost_per_1k_tokens_usd": 0.3 },
    "enterprise": { "monthly_price_usd": 499.0, "rate_limit_per_day": 100000,"monthly_quota_tokens": 10000000,"priority": "critical", "cost_per_1k_tokens_usd": 0.2 }
  },
  "revenue_split": { "users_pool": 0.90, "infrastructure": 0.09, "central": 0.01 },
  "principles": [
    "Free tier is free forever — gatekeeping intelligence is not the goal.",
    "90% of paid revenue flows to compute providers (the people who train the hive).",
    "No vendor lock-in — local-first, your data stays on your device by default."
  ]
}
```

## Sign up + key management

### `POST /keys` — create an API key

Requires a hevolve.ai account (JWT Bearer auth).

```bash
curl -X POST https://hevolve.ai/api/v1/intelligence/keys \
  -H "Authorization: Bearer $HEVOLVE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-laptop", "tier": "free"}'
```

The raw API key is returned **once** in the response; it cannot be retrieved
again later.  Store it as `HEVOLVE_API_KEY` in your environment.

### `GET /keys` — list your keys

```bash
curl https://hevolve.ai/api/v1/intelligence/keys \
  -H "Authorization: Bearer $HEVOLVE_JWT"
```

### `DELETE /keys/<key_id>` — revoke a key

```bash
curl -X DELETE https://hevolve.ai/api/v1/intelligence/keys/<key_id> \
  -H "Authorization: Bearer $HEVOLVE_JWT"
```

### `POST /keys/<key_id>/upgrade` — upgrade tier (synchronous, USD / cards)

Pipes through AP2's PaymentLedger.  Mock gateway in dev (`STRIPE_API_KEY`
unset); real Stripe in production.  Synchronous flow — completes in one
request.  For India / UPI / netbanking, use the PhonePe-rail variant
below.

```bash
curl -X POST https://hevolve.ai/api/v1/intelligence/keys/<key_id>/upgrade \
  -H "Authorization: Bearer $HEVOLVE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "target_tier": "starter",
    "payment_method": "pm_card_visa"
  }'
```

Returns the new tier limits + revenue split breakdown:

```json
{
  "success": true,
  "api_key": {
    "id": "...",
    "tier": "starter",
    "rate_limit_per_day": 1000,
    "monthly_quota": 30000
  },
  "payment": {
    "request_id": "...",
    "amount_usd": 9.0,
    "status": "completed"
  },
  "revenue_split": {
    "users_pool_usd": 8.10,
    "infrastructure_usd": 0.81,
    "central_usd": 0.09
  }
}
```

### `POST /keys/<key_id>/upgrade/phonepe` — upgrade tier (India: UPI / cards / netbanking)

PhonePe-rail upgrade for Indian customers.  Initiates a PhonePe Standard
Checkout session and returns a redirect URL.  The tier is **not** bumped
synchronously — PhonePe is a redirect-then-webhook flow.  When the user
completes payment on PhonePe's hosted page, PhonePe POSTs the result to
our `/phonepe/callback` webhook which finalizes the tier change.

Active only when the operator has set `PHONEPE_MERCHANT_ID` and
`PHONEPE_SALT_KEY` on the deployment (and optionally
`PHONEPE_SALT_INDEX`, `PHONEPE_ENV`).  Otherwise the endpoint returns
503.

```bash
curl -X POST https://hevolve.ai/api/v1/intelligence/keys/<key_id>/upgrade/phonepe \
  -H "Authorization: Bearer $HEVOLVE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "target_tier": "starter",
    "mobile_number": "9876543210",
    "redirect_url": "https://your-app.example/payment/complete",
    "callback_url": "https://hevolve.ai/api/v1/intelligence/phonepe/callback"
  }'
```

Response (`202 Accepted`):

```json
{
  "success": true,
  "status": "redirect_required",
  "redirect_url": "https://mercury-uat.phonepe.com/transact/...",
  "payment_request_id": "...",
  "gateway_transaction_id": "hartos_a1b2c3...",
  "amount_usd": 9.0,
  "inr_amount_estimated_paise": 75600,
  "message": "Redirect the user to redirect_url to complete payment..."
}
```

Currency note: tier prices are in USD; PhonePe is INR-only.  HARTOS
converts via `PHONEPE_USD_INR_RATE` (default 84.0).  Pass `inr_amount`
in the request body to bypass conversion entirely with a specific INR
amount.

### `POST /phonepe/callback` — PhonePe server-to-server webhook

Receives PhonePe's payment-result notification, verifies the X-VERIFY
signature, re-confirms via PhonePe's status API (defense in depth), then
on success bumps the API key tier and marks the payment COMPLETED.

This endpoint is **not authenticated** by user token — it's authenticated
by the PhonePe X-VERIFY signature.  Operators must register this URL on
the PhonePe merchant dashboard as the S2S callback.  Idempotent — safe
for PhonePe to retry.

## Inference endpoints

All require `Authorization: Bearer <api_key>`.

### `POST /chat` — conversational LLM

```bash
curl -X POST https://hevolve.ai/api/v1/intelligence/chat \
  -H "Authorization: Bearer $HEVOLVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Summarise this PR description in 3 bullets...",
    "context": "optional prior turns"
  }'
```

### `POST /analyze` — structured analysis

```bash
curl -X POST https://hevolve.ai/api/v1/intelligence/analyze \
  -H "Authorization: Bearer $HEVOLVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "...your text or data...",
    "task": "sentiment|summary|classification"
  }'
```

### `POST /generate` — content generation

```bash
curl -X POST https://hevolve.ai/api/v1/intelligence/generate \
  -H "Authorization: Bearer $HEVOLVE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a Python function that ...",
    "max_tokens": 500
  }'
```

### `GET /hivemind` — hive-level reasoning

The hive aggregates responses across multiple compute providers and returns
the consensus.  Higher latency than `/chat`, higher quality for hard
questions.

```bash
curl "https://hevolve.ai/api/v1/intelligence/hivemind?q=..." \
  -H "Authorization: Bearer $HEVOLVE_API_KEY"
```

### `GET /usage` — your current usage

```bash
curl https://hevolve.ai/api/v1/intelligence/usage \
  -H "Authorization: Bearer $HEVOLVE_API_KEY"
```

Returns: requests this day, tokens this month, tier limits remaining.

## Rate limiting

| Header | Meaning |
|---|---|
| `X-RateLimit-Limit` | Daily cap for your tier |
| `X-RateLimit-Remaining` | Requests left today |
| `X-RateLimit-Reset` | Seconds until the daily window resets |

When you hit the daily or monthly cap, the API returns `429 Too Many
Requests` with a `Retry-After` header and `X-Upgrade-Url` pointing to the
upgrade endpoint for your key.

## Errors

| Code | Meaning |
|---|---|
| `400` | Bad request (missing param, invalid tier name, etc.) |
| `401` | Missing / invalid API key |
| `402` | Payment Required — sent by the upgrade endpoint when authorization or processing fails |
| `403` | Quota exhausted for the month (upgrade tier or wait for reset) |
| `404` | Key not found / wrong owner |
| `429` | Daily rate limit |
| `5xx` | Transient — retry with exponential backoff |

## Why we built it this way

- **Free tier is free forever.**  Hevolve was founded on the conviction that
  intelligence should not be gatekept.  Anyone can use the API; only those
  who need higher limits pay.
- **90/9/1 revenue split.**  The people who train the hive get the majority
  of the value created.  Hevolve AI Pvt Ltd takes 1% — enough to keep the
  lights on, not enough to make us your owner.
- **Local-first by default.**  The same intelligence available via the API
  is available on-device through Nunba.  Customers who need a hosted API
  pay for the convenience + reliability of our hosted compute; everyone
  else runs Nunba locally for free.
- **One code path, three endpoints (flat / regional / central).**  Whether
  you hit hevolve.ai or run locally, the recipe pipeline and hive
  consensus are identical.  We don't have a "premium model" you can only
  get over the API.

## SDK / language bindings

Python:

```python
from hevolve import Client

c = Client(api_key='...')
reply = c.chat("Explain rate-limit semantics in this API")
print(reply.text)
```

Other languages: any HTTP client works.  The endpoints are deliberately
plain JSON over HTTP so you don't have to wait for an SDK in your
language.

## See also

- [Hive contributor onboarding](../hartos/downloads.md) — become a compute
  provider, earn from the users pool.
- [Revenue split policy](../architecture/overview.md) — how 90/9/1 is
  computed and settled.
