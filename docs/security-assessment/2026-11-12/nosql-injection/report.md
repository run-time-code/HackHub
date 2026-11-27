# MongoDB / NoSQL Injection Security Assessment

**Assessment date:** 15 November 2026  
**Target:** HackHub local development API  
**Endpoint tested:** `GET /api/hackathons`  
**Database:** MongoDB through Mongoose  
**Assessment type:** Source review and controlled read-only HTTP testing

## 1. Executive Summary

The assessment reviewed query handling in six API service areas and performed controlled GET-only tests against the public hackathon listing endpoint.

No NoSQL injection vulnerability was demonstrated in the tested endpoint or reviewed service implementations.

Two sanitizer implementation concerns were identified:

1. The middleware attempts to replace `req.query`, although Express 5.3.0 exposes it through a getter. The assignment does not reliably replace the parsed query object.
2. The sanitizer declares `DANGEROUS_KEYS` but does not use it when copying object properties. The handling of `__proto__` therefore requires correction and security testing.

Neither concern was demonstrated to provide an exploitable NoSQL injection or global prototype pollution vulnerability.

**Overall classification:** No confirmed NoSQL injection; remediation required for sanitizer implementation concerns.

## 2. Scope

Source files and service functions reviewed:

- `apps/api/middleware/sanitizeMiddleware.js`
- `apps/api/src/services/hackathonsService.js`
- `apps/api/src/services/hackathonRankingService.js`
- `apps/api/src/services/joinRequestsService.js`
- `apps/api/src/services/notificationsService.js`
- `apps/api/src/services/teamsService.js`
- `apps/api/src/services/usersService.js`
- Relevant controllers, route registration and application middleware order.

The tested endpoint was:

`GET http://localhost:5000/api/hackathons`

## 3. Test Results

| Test | HTTP result | Observation |
|---|---:|---|
| Baseline listing | 200 | 803 total, 20 returned |
| Normal search | 200 | Search works |
| Regex metacharacters `.*` | 200 | Zero results |
| Invalid sort | 400 | Rejected |
| Operator-shaped `q[$ne]` | 200 | Same total and first three IDs as baseline |
| Dotted query key | 200 | Same total and first three IDs as baseline |
| Literal `q=$ne` | 200 | Zero results |
| Invalid `upcoming` | 400 | Rejected |

The operator-shaped and dotted query tests did not alter the listing results. These results do not demonstrate query-operator injection.

## 4. Source Review

### 4.1 Hackathon listing

The service validates sort values, converts pagination inputs to numbers, validates boolean filters and escapes search text before constructing regular expressions.

### 4.2 Teammate search

The service builds a fixed MongoDB filter, validates availability, parses skill and interest filters, and escapes the free-text search input.

### 4.3 Team listing

The service requires and validates the hackathon ObjectId, validates status against an allowlist, and constructs its own database filter.

### 4.4 Notifications

The database filter is constructed using the authenticated user ID. Pagination is converted to numeric values.

### 4.5 Join requests

The service constructs the filter using the authenticated user ID and team leadership relationships. Status is checked against an allowlist.

### 4.6 Recommendations

The service constructs its own fixed MongoDB filter. The user-provided limit is converted to a number and bounded.

No reviewed service directly merges the complete user query object into a MongoDB filter.

## 5. Findings

### NSQL-001: Ineffective query sanitization under Express 5

**Severity:** Medium — provisional  
**Status:** Open  
**Location:** `apps/api/middleware/sanitizeMiddleware.js`

The middleware assigns a sanitized value to `req.query`. Express 5.3.0 defines `req.query` using a getter. The inspected implementation does not provide a setter, so the assignment does not reliably replace the parsed query object.

This means the query-sanitization step cannot be relied upon.

The reviewed services apply additional field-level validation, and no NoSQL injection was demonstrated during the controlled tests.

**Recommendation:** Use a separately named sanitized query object or validate individual query parameters before passing them to services. Do not rely on assigning to `req.query`.

### NSQL-002: Dangerous property names are not explicitly rejected

**Severity:** Medium — provisional  
**Status:** Open  
**Location:** `apps/api/middleware/sanitizeMiddleware.js`

The `DANGEROUS_KEYS` set includes `__proto__`, `constructor` and `prototype`, but the recursive sanitizer does not check this set before assigning properties to ordinary objects.

This may allow object-specific prototype manipulation when untrusted objects contain dangerous property names.

No successful exploit or global `Object.prototype` pollution was demonstrated.

**Recommendation:** Explicitly reject dangerous keys during recursive object copying. Consider using null-prototype output objects and safe property assignment. Add regression tests for nested objects and arrays.

## 6. Security Controls Observed

- Search regular expressions use escaped user input.
- Sort and status values use allowlists.
- ObjectId inputs are validated where applicable.
- Pagination inputs are converted to numeric values and bounded.
- User-specific database filters use authenticated identities.
- Services construct MongoDB filters internally.

## 7. Limitations

- Only controlled GET requests were used for live endpoint testing.
- No database records were modified.
- Authenticated endpoint injection testing was not completed.
- No destructive payloads were used.
- The sanitizer findings have not been verified through a successful exploit.
- The assessment does not prove the entire application is free of NoSQL injection.

## 8. Conclusion

No confirmed NoSQL injection vulnerability was found in the tested endpoint or reviewed service implementations.

The ineffective `req.query` sanitization and unused dangerous-key protection require remediation review. The assessment must not be described as a complete NoSQL security pass until these concerns are addressed and retested.

## 9. Evidence

See:

`evidence/nosql-assessment-results-2026-11-15.txt`

## 10. Final Status

**Result:** No confirmed NoSQL injection; two sanitizer implementation concerns remain open.

**Application source changes:** None made during this assessment.
