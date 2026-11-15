# Wapiti - Security Retest Report

## 1. Retest Information

- Tool: Wapiti 3.3.2
- Retest date: 14 November 2026
- Original finding ID: Not applicable
- Patch commit: None
- Environment: Local HackHub development API, accessed from WSL Ubuntu 24.04

## 2. Original Vulnerability

No original vulnerability was confirmed by the crawl-only assessment. No application patch was made.

## 3. Retest Method

A crawl-only Wapiti execution was completed with all attack modules disabled:

```bash
wapiti \
  -u http://172.25.16.1:5000/api/ \
  --scope folder \
  --module= \
  --depth 2 \
  --max-links-per-page 10 \
  --max-scan-time 90 \
  --tasks 1 \
  --timeout 10 \
  --flush-session \
  --no-bugreport \
  -v 1 \
  -f json \
  -o wapiti-crawl-only-2026-11-14.json \
  --log wapiti-crawl-only-2026-11-14.log
```

The generated JSON was parsed successfully. The report recorded one crawled page and zero entries in the vulnerability and anomaly categories.

## 4. Retest Results

| Check | Before Fix | After Fix |
|---|---|---|
| Vulnerability detected | No vulnerability assessment performed | Not applicable; attack modules disabled |
| Security validation | Not performed | Not performed |
| Application functionality | API health endpoint returned HTTP 200 | No application changes made; separate health check returned HTTP 200 |

## 5. Evidence

Evidence directory: `evidence/`

- `wapiti-crawl-only-2026-11-14.json`
- `wapiti-crawl-only-2026-11-14.log`

The JSON report passed parsing validation. The Wapiti log records successful report generation and one URL/form discovered.

## 6. Final Status

- [ ] Fixed and verified
- [ ] Partially fixed
- [ ] Not fixed
- [x] Unable to perform vulnerability-fix retest
- [ ] Not applicable

There was no confirmed vulnerability or patch to retest. This status does not indicate a failed remediation.

## 7. Conclusion

Wapiti successfully completed a restricted crawl and generated valid evidence. Since no vulnerability attack modules were enabled and no application remediation was performed, a vulnerability-fix retest was not applicable.

Active vulnerability testing and route coverage remain outstanding. No claim that the application is vulnerability-free is made.
