# Rate-Limit Validation Report

**Date:** 2026-10-31  
**Environment:** Source review only; no live boundary requests performed

## Static configuration

| Control | Configured limit | Keying / notes |
|---|---|---|
| General API | 300 requests / 15 minutes | `express-rate-limit` default in-process store; standard headers enabled |
| Login | 10 / 15 minutes | IP-based default |
| Registration | 5 / hour | IP-based default |
| Verification resend | 3 / 15 minutes | IP-based default |
| Password reset | 5 / 15 minutes | IP-based default |
| Token refresh | 30 / 15 minutes | IP-based default |
| OAuth start | 30 / 15 minutes | IP-based default |
| CSRF token bootstrap | 60 / 15 minutes | IP-based default |
| Team and join-request writes | 100 / hour | User id when authenticated; otherwise IPv6-safe IP key |
| Anonymous feedback | 10 / hour | IPv6-safe IP key |
| Join requests | 10 per rolling 24 hours | `MAX_JOIN_REQUESTS_PER_DAY`; default documented in API spec/Render blueprint |

The general API limiter excludes health and metrics paths. The implementation
does not configure a shared Redis rate-limit store; the checked-in deployment
documentation describes a single-instance deployment. Per-process limits may
not provide the same aggregate cap across multiple instances.

## Runtime observation

No low-volume boundary test was run. Therefore:

- Observed HTTP status: **NOT RUN**
- Observed `RateLimit-*` headers: **NOT RUN**
- Threshold enforcement at runtime: **NOT VERIFIED**
- Staging/production behavior: **NOT TESTED**

The active API regression suite did not initialize because of the logger
module-load failure. Historical load-test evidence reports rate-limit 429
responses on a repeated run; the current assessment did not generate any
requests or exhaust a limiter.
