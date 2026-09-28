# Contributing to CDB (Client DataBase)

Thank you for your interest in contributing to CDB! As an open-source, AI & ML-native personal CRM and customer intelligence platform, we welcome community contributions.

---

## 📜 Licensing & Inbound Contributions

CDB is distributed under the **MIT License**.

By contributing to this repository (submitting Pull Requests, patches, code, or documentation), you agree that:
1. Your contributions are made under the terms of the [MIT License](LICENSE).
2. You hold the necessary rights and authority to license your contributions under the MIT License.
3. Your contributions do not infringe on any third-party intellectual property rights or proprietary agreements.

---

## 🏛️ Open Core Architecture & Repository Boundaries

CDB follows an **Open Core** architecture:
- **`cdb` (This Repository)**: Public and MIT licensed. Contains the core engine, entity resolution, signal detection, connectors, self-hosted Docker Compose stack, and Next.js frontend.
- **`cdb-hub` / `cdb-cloud` (Separate Repository)**: Proprietary and commercial. Houses multi-tenant isolation, enterprise billing/credits, consenting network data pooling, and enterprise SSO/GDPR management.

When contributing, please ensure that contributions intended for the public core do not couple to proprietary SaaS services or introduce copyleft-incompatible licenses.

---

## 🛠️ Development & Quality Standards

Before submitting a Pull Request, please ensure all automated checks pass locally:

### Backend Quality
```bash
cd src/backend
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

### Frontend Quality
```bash
cd src/frontend
npm run typecheck
npm test
```

### Conventional Commits
All commits should adhere to [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new capabilities (triggers minor release)
- `fix:` for bug fixes (triggers patch release)
- `docs:`, `chore:`, `refactor:`, `test:` for non-release changes

---

## 📄 Third-Party Dependencies

All dependencies added to CDB must have permissive, OSI-approved licenses (e.g., MIT, Apache 2.0, BSD-2-Clause, BSD-3-Clause, ISC). Dependencies with restrictive copyleft licenses (such as AGPL or strict GPL) are prohibited to maintain the commercial and single-tenant self-hosting utility of the MIT-licensed core.
