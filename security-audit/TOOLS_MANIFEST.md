# Audit tooling manifest (SUPPLY-01)

Provenance record for everything under `security-audit/tools/`, which is
Git-ignored because it is re-downloadable and too large to commit. This file
and `tools/bin/` are the tracked record of what was used.

Rules:

- A tool is only usable as evidence if its version, source and checksum are
  recorded here.
- `tools/bin/` must contain no shims that fake a network client. The earlier
  fake DNS shims are gone; `tools/bin/dig` is a real dnspython-based client.
- Hashes are SHA-256 of the downloaded artifact or of the installed binary.

## Tools

| Tool | Version | Installed path | Source | License | SHA-256 |
|---|---|---|---|---|---|
| CodeQL CLI | 2.27.5 | `tools/codeql/` (archive `tools/codeql.tar.gz`) | https://github.com/github/codeql-cli-binaries/releases | GitHub CodeQL Terms and Conditions (see `tools/codeql/LICENSE.md`) | `a5f205466b976ea9b345957fc133eeea9021e71aeffc99243ec7b9e99b1d6ed5` (archive) |
| Burp Suite Community | 2025.11 (jar build 43021) | `tools/burp/`, launcher `tools/burp.sh` | https://portswigger.net/burp/communitydownload | Proprietary, PortSwigger Community licence | `395666f88752a7ae52710a4c5e47adf0aacaf9d8afcc34eb1229c64826715658` (`burp.sh`) |
| Trivy | 0.76.2 | `tools/trivy` | https://github.com/aquasecurity/trivy/releases | Apache-2.0 | `6a972c69606c7b3ea4c6bdcc6fc9332ea9ad38381624310c1e85cc77345909f3` (binary); `bc0fc726e017b8927a62b2d3531d7a84ee01769daf5c99ed866dced54089fdbf` (`trivy.tgz`) |
| Gitleaks | 8.30.1 | `tools/gitleaks` | https://github.com/gitleaks/gitleaks/releases | MIT | `88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509` (binary); `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` (`gl.tgz`) |
| Feroxbuster | 2.14.0 | `tools/feroxbuster` | https://github.com/epi052/feroxbuster/releases | MIT / Apache-2.0 | `fc370a80ce141c3cfd1137bde9a13a5b7cf8c445740a63ca0f4a3ac2be30d906` (binary); `3ab2cefdb03af090bcf11c4b82bd85a7e8a2b4439237ac06993568eade28ee96` (`ferox.tgz`) |
| kiterunner | 1.0.2 (`e7a7fa6`, built 2021-04-11) | `tools/kr` | https://github.com/assetnote/kiterunner/releases | Apache-2.0 | `93e3f9ebfc9a2400a345961bf8e8e0c937d32c473db1e620e277622bdb33f6e7` (binary); `6f0b70aabf747de592445a690281897eebbc45927e9264185d34ffb11637613b` (`kr.tgz`) |
| sqlmap | 1.10.11.89 (git `5db2e62`, 2026-11-19) | `tools/sqlmap/` | https://github.com/sqlmapproject/sqlmap | GPL-2.0 | Not hashed: git checkout, identify by commit. |
| Commix | git `c20a1c0`, 2026-11-21 | `tools/commix/` | https://github.com/commixproject/commix | GPL-3.0 | Not hashed: git checkout, identify by commit. |
| testssl.sh | 3.3dev (`e3539fb`, 2026-11-25) | `tools/testssl/` | https://github.com/drwetter/testssl.sh | GPL-2.0 | Not hashed: git checkout, identify by commit. |
| XSStrike | git `ab27955`, 2025-04-26 | `tools/xsstrike/` | https://github.com/s0md3v/XSStrike | GPL-3.0 | Not hashed: git checkout, identify by commit. |
| Python venv | Python 3.14.7 | `tools/venv/` | `python3 -m venv` | — | Recreate from the package list below. |

## Python environment (`tools/venv`)

| Package | Version | License |
|---|---|---|
| checkov | 3.4.6 | Apache-2.0 |
| semgrep | 1.186.0 | LGPL-2.1 |
| requests | 2.34.2 | Apache-2.0 |
| dnspython | 2.9.2 | ISC |
| playwright | 1.65.2 | Apache-2.0 |

Recreate with `python3 -m venv tools/venv` and
`tools/venv/bin/pip install checkov semgrep requests dnspython playwright`,
then `tools/venv/bin/playwright install chromium` for the browser checks. The
recreated set will not be byte-identical, so re-record the resolved versions
before using a new venv as evidence.

## Duplicates and cleanup

- `trivy` + `trivy.tgz`, `gitleaks` + `gl.tgz`, `feroxbuster` + `ferox.tgz`,
  `kr` + `kr.tgz` are install artifacts kept "just in case". They are
  redundant: keep the extracted binary and delete the archive after
  verifying the hash above, or keep the archive and delete the binary.
- `tools/codeql.tar.gz` duplicates `tools/codeql/` (664 MB).
- `tools/burp-install.log` is an install log, not evidence.
- `tools/bin/dig` is a small dnspython wrapper added to replace the removed
  fake DNS binaries. It performs real DNS queries.

## Verification runs after the workflow fixes

`checkov -d .github/workflows --framework github_actions` →
**248 passed, 0 failed, 0 skipped** (previously `CKV_GHA_3` ×2,
`CKV_GHA_7` ×1, `CKV2_GHA_1` ×4).

## SBOM / SCA coverage

| Ecosystem | Tool | Evidence | Status |
|---|---|---|---|
| npm (833 packages) | `npm audit` | `evidence/npm-audit.json`, `evidence/npm-audit.txt` | Clean at capture time |
| npm lockfiles | `trivy fs` | `evidence/trivy-fs.json` | 0 known vulnerabilities |
| Python, Go, Docker images | — | — | **Not scanned.** No Python/Go application dependencies and no built image exist in this repo; a container SBOM should be produced when a production image is built. |

A generated SBOM (for example CycloneDX from `npm sbom`) should be added under
`security-audit/evidence/` when the release pipeline produces build artifacts.
Until then this manifest is the tool-level provenance record only.
