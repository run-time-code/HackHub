# NoSQL Injection Assessment — Remediation Plan

**Assessment date:** 15 November 2026  
**Status:** Two findings open; no application patch applied.

## NSQL-001 — Ineffective Express 5 query sanitization

**Severity:** Medium — provisional  
**File:** `apps/api/middleware/sanitizeMiddleware.js`

### Observation

The middleware assigns a sanitized object to `req.query`. Express 5.3.0 exposes `req.query` through a getter, so this assignment does not reliably replace the parsed query object.

### Recommended remediation

1. Do not assign to `req.query`.
2. Create a separate sanitized query object, or validate individual query parameters before passing them to services.
3. Ensure controllers pass only validated values to service functions.
4. Add tests covering nested query parameters, bracket notation, dotted keys and MongoDB operator-shaped input.
5. Confirm the behavior against the exact Express version used by the application.

### Retest criteria

- Sanitized query values are demonstrably used by controllers and services.
- Operator-shaped and dotted input cannot become MongoDB operators or unintended field paths.
- Existing legitimate search and filtering behavior remains functional.

## NSQL-002 — Dangerous object keys are not explicitly rejected

**Severity:** Medium — provisional  
**File:** `apps/api/middleware/sanitizeMiddleware.js`

### Observation

`DANGEROUS_KEYS` contains `__proto__`, `constructor` and `prototype`, but the sanitizer does not use this set when copying properties.

### Recommended remediation

1. Reject dangerous property names during recursive sanitization.
2. Consider creating sanitized objects with `Object.create(null)`.
3. Use safe property-copying logic.
4. Apply the protection recursively to nested objects and objects inside arrays.
5. Add regression tests for all three dangerous property names.
6. Confirm that ordinary user data, including valid `skillProficiency` keys, continues to work.

### Retest criteria

- Dangerous keys are rejected or safely handled at every nesting level.
- No unintended prototype changes occur.
- No global `Object.prototype` pollution occurs in the regression tests.
- Legitimate request payloads continue to pass.

## Implementation and Change Control

No source-code changes were made during this assessment.

Before applying fixes:
- Review the existing uncommitted changes in the sanitizer file.
- Preserve the current working-tree contents.
- Make only approved changes.
- Run the relevant API tests and security regression tests.

## Overall

Both findings remain open pending approved remediation and retesting. Neither is currently classified as a confirmed exploitable NoSQL injection vulnerability.
