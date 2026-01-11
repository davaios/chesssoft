# Dependency Audit Report

**Date:** January 11, 2026
**Project:** ChessForge
**Auditor:** Automated Analysis

---

## Executive Summary

This audit identified **1 critical security vulnerability**, **several outdated packages**, and **minimal bloat** in the project dependencies. Immediate action is required for the critical vulnerability.

### Priority Actions Required

| Priority | Issue | Impact |
|----------|-------|--------|
| **CRITICAL** | React/Next.js RCE vulnerability (CVE-2025-55182) | Unauthenticated remote code execution |
| HIGH | Outdated Next.js version | Missing security patches |
| MEDIUM | Several minor version updates available | Performance/bug fixes |

---

## Critical Security Vulnerabilities

### CVE-2025-55182 / CVE-2025-66478 - React Server Components RCE

**Severity:** CVSS 10.0 (CRITICAL)
**Status:** Active exploitation in the wild
**Affected:** React 19.0.0 - 19.2.0, Next.js >= 14.3.0

**Description:**
A critical vulnerability in the React Server Components (RSC) "Flight" protocol allows unauthenticated remote code execution via insecure deserialization. This vulnerability has been actively exploited by state-sponsored threat actors within hours of disclosure.

**Current versions in project:**
- `react`: ^19.0.0 (VULNERABLE)
- `next`: ^15.1.0 (VULNERABLE)

**Remediation:**
```json
{
  "react": "^19.2.1",
  "react-dom": "^19.2.1",
  "next": "^15.5.10"
}
```

**Additional steps after upgrade:**
1. Rebuild and redeploy the application
2. Rotate all application secrets (API keys, JWT secrets, etc.)

**References:**
- [Next.js Security Update](https://nextjs.org/blog/security-update-2025-12-11)
- [React2Shell Vulnerability Analysis](https://www.wiz.io/blog/critical-vulnerability-in-react-cve-2025-55182)
- [AWS Security Blog](https://aws.amazon.com/blogs/security/china-nexus-cyber-threat-groups-rapidly-exploit-react2shell-vulnerability-cve-2025-55182/)

---

## Frontend Dependencies (package.json)

### Outdated Packages

| Package | Current | Latest | Severity | Notes |
|---------|---------|--------|----------|-------|
| `next` | ^15.1.0 | 16.1.1 | **CRITICAL** | Security patches required (15.5.10 minimum) |
| `react` | ^19.0.0 | 19.2.3 | **CRITICAL** | Security patches in 19.2.1+ |
| `react-dom` | ^19.0.0 | 19.2.3 | **CRITICAL** | Must match React version |
| `react-chessboard` | ^4.7.0 | 5.8.6 | LOW | Major version upgrade available |
| `tailwind-merge` | ^2.6.0 | 3.4.0 | LOW | Major version with breaking changes |
| `@tanstack/react-query` | ^5.62.0 | 5.90.16 | LOW | Minor updates, bug fixes |
| `chess.js` | ^1.0.0 | 1.4.0 | LOW | Bug fixes |

### Recommended package.json Updates

```json
{
  "dependencies": {
    "next": "^15.5.10",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "chess.js": "^1.4.0",
    "react-chessboard": "^4.7.3",
    "@tanstack/react-query": "^5.90.0",
    "zustand": "^5.0.9",
    "date-fns": "^4.1.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  }
}
```

**Notes:**
- Keep `tailwind-merge` at ^2.x unless ready to handle breaking changes in v3
- `react-chessboard` v5.x has breaking API changes; evaluate before upgrading

### Bloat Assessment: LOW

The frontend dependencies are well-curated:
- No redundant utility libraries
- Single state management solution (Zustand is lightweight at ~2KB)
- No heavy UI component libraries
- Direct chess.js usage rather than wrapper libraries

---

## Backend Dependencies (pyproject.toml)

### Security Considerations

| Package | Current | Status | Notes |
|---------|---------|--------|-------|
| `fastapi` | >=0.115.0 | OK | No direct CVEs; ensure Starlette >= 0.40.0 |
| `starlette` | >=0.41.0 | OK | CVE-2024-47874 fixed in 0.40.0 |
| `pyjwt` | >=2.10.0 | REVIEW | CVE-2024-53861 fixed in 2.10.1 |
| `bcrypt` | >=4.2.0 | OK | No known vulnerabilities |
| `anthropic` | >=0.40.0 | OK | AI integration, no security issues |

### Recommended pyproject.toml Updates

```toml
dependencies = [
    # Bump minimum PyJWT to include security fix
    "pyjwt>=2.10.1,<3.0.0",

    # All other dependencies are well-specified
    # No changes needed
]
```

### Bloat Assessment: EXCELLENT

The backend dependencies demonstrate excellent practices:
- Direct Anthropic SDK usage instead of LangChain (saves ~200MB+ of transitive dependencies)
- `orjson` for fast JSON serialization (better than standard json)
- `structlog` for structured logging (lightweight)
- No unnecessary ORM wrappers (direct SQLAlchemy usage)

**Positive observations:**
- Comment in pyproject.toml explicitly notes "no LangChain bloat"
- Async-first architecture with minimal overhead
- Security tools included in dev dependencies (pip-audit, ruff with bandit)

---

## Transitive Dependency Concerns

### Frontend
Once a lockfile is generated, monitor these commonly vulnerable transitive dependencies:
- `postcss` - History of ReDoS vulnerabilities
- `semver` - Regex denial of service
- Node.js native modules

### Backend
- `cryptography` - Frequently patched; ensure latest
- `urllib3` - HTTP library with occasional CVEs
- `certifi` - CA certificate bundle; keep updated

---

## Recommendations Summary

### Immediate (within 24 hours)

1. **Update React ecosystem to patch CVE-2025-55182:**
   ```bash
   cd frontend
   pnpm update react react-dom next
   ```

2. **Rotate all secrets** after deploying the patched version

3. **Bump PyJWT minimum version** to 2.10.1

### Short-term (within 1 week)

1. Generate and commit lockfiles for reproducible builds:
   ```bash
   # Frontend
   cd frontend && pnpm install
   git add pnpm-lock.yaml

   # Backend
   cd backend && pip-compile pyproject.toml -o requirements.lock
   ```

2. Set up automated dependency scanning:
   - Enable GitHub Dependabot
   - Add `pnpm audit` to CI pipeline
   - Add `pip-audit` to CI pipeline

### Long-term

1. Evaluate `react-chessboard` v5.x upgrade path
2. Consider `tailwind-merge` v3 when ready
3. Pin exact versions in production for stability

---

## Files Changed

This audit recommends the following file changes:

### frontend/package.json
- Update `next` to ^15.5.10
- Update `react` to ^19.2.3
- Update `react-dom` to ^19.2.3
- Update `pyjwt` minimum to 2.10.1

### backend/pyproject.toml
- Update `pyjwt` minimum version to 2.10.1

---

## Appendix: Vulnerability Sources

- [Snyk FastAPI Vulnerabilities](https://security.snyk.io/package/pip/fastapi)
- [PyJWT CVE Details](https://www.cvedetails.com/product/40039/Pyjwt-Project-Pyjwt.html)
- [Next.js Security Advisory](https://nextjs.org/blog/CVE-2025-66478)
- [CISA Weekly Vulnerability Summary](https://www.cisa.gov/news-events/bulletins/sb25-356)
