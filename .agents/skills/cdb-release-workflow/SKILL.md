---
name: cdb-release-workflow
description: >-
  Use this skill when the user wants to cut a new CDB release, understand how
  the semantic-release pipeline works, publish a new Docker image to GHCR,
  make the cdb-backend pip-installable for cdb-cloud, or bump the cdb-backend
  version in a dependent repo.
---

# CDB Release Workflow

CDB uses **Conventional Commits + semantic-release** to automate versioning,
changelog generation, and multi-arch Docker image publishing to GHCR.

---

## Trigger

A release is triggered automatically on every push to `main`, OR manually via:

```
GitHub Actions → "Release & Semantic Versioning" → Run workflow
```

Optional `sha` input overrides which commit to tag.

---

## What the Release Pipeline Does

### Step 1 — Semantic Release (`release` job)
- Analyses commit messages since the last tag (Conventional Commits).
- Determines the next semver version (`patch` / `minor` / `major`).
- Updates `src/backend/pyproject.toml` (`version = "X.Y.Z"`) and `src/frontend/package.json`.
- Commits those bumps back to `main` (`chore(release): X.Y.Z [skip ci]`).
- Creates a GitHub Release + updates `CHANGELOG.md`.

### Step 2 — Build (`build` job)
- Builds Docker images for `backend` and `frontend` on **linux/amd64** and **linux/arm64**.
- Pushes each arch by digest to GHCR (no tag yet).

### Step 3 — Merge (`merge` job)
- Creates a multi-arch manifest list per service.
- Tags it with: `latest`, `production`, `vX.Y.Z`, `X.Y.Z`.
- Images:
  - `ghcr.io/<org>/cdb-backend:X.Y.Z`
  - `ghcr.io/<org>/cdb-frontend:X.Y.Z`

---

## Conventional Commit Message Rules

| Prefix | Version bump |
|--------|-------------|
| `fix:` | patch (0.0.x) |
| `feat:` | minor (0.x.0) |
| `feat!:` or `BREAKING CHANGE:` | major (x.0.0) |
| `chore:`, `docs:`, `refactor:`, `test:` | no release |

```bash
# Examples
git commit -m "fix: handle null person in dormant account detector"
git commit -m "feat: add hiring_funding_event signal detector"
git commit -m "feat!: rename Signal.entity_id to Signal.subject_id"
```

---

## Making cdb Pip-Installable (for cdb-hub & Community)

The `pyproject.toml` at `src/backend/` is configured with `hatchling` as the build backend.
The release workflow automatically builds and publishes wheel and sdist artifacts:

```yaml
# Step 4 in .github/workflows/release.yml
publish-package:
  name: Build & Publish Python Package
  needs: [release, merge]
  if: needs.release.outputs.new_release_published == 'true' || github.event_name == 'workflow_dispatch'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    - uses: astral-sh/setup-uv@v5
      with:
        enable-cache: true
        python-version: "3.12"
    - run: |
        cd src/backend
        uv build
    - uses: actions/upload-artifact@v4
      with:
        name: cdb-python-package
        path: src/backend/dist/*
    - run: gh release upload "v${{ needs.release.outputs.new_release_version }}" src/backend/dist/* --clobber
```

Once published, `cdb-hub` pins it:

```toml
# cdb-hub/src/backend/pyproject.toml
dependencies = [
    "cdb==1.42.0",   # bump this whenever cdb cuts a release
]
```

---

## Manual Release Checklist

1. Ensure all commits on `main` follow Conventional Commits.
2. Run CI checks locally:
   ```bash
   cd src/backend && ruff check . && ruff format --check . && pytest
   cd src/frontend && npm run typecheck && npm test
   ```
3. Merge to `main` → release pipeline fires automatically.
4. Verify new GitHub Release tag, CHANGELOG entry, and attached `.whl`/`.tar.gz` packages.
5. Verify GHCR images tagged `vX.Y.Z` and `production`.
6. If `cdb-hub` exists, open a PR there bumping `cdb==X.Y.Z`.

---

## Key Files

| File | Purpose |
|------|---------|
| [`.releaserc.json`](../../.releaserc.json) | Semantic-release plugin config |
| [`.github/workflows/release.yml`](../../.github/workflows/release.yml) | Full release pipeline |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | PR checks (lint, test, typecheck) |
| [`src/backend/pyproject.toml`](../../src/backend/pyproject.toml) | Package version + build config |
| [`src/frontend/package.json`](../../src/frontend/package.json) | Frontend version |
| [`CHANGELOG.md`](../../CHANGELOG.md) | Auto-generated release notes |


### Step 5 — Trigger Private Deployment (`trigger-deployment` job)
- Sends a `repository_dispatch` webhook to `Data-Biz-AI-Consultancy/Jager-Deployment` with `event_type: deploy-release`.
- Payload passes `service: "cdb"`, `version: X.Y.Z`, `tag: "vX.Y.Z"`, and `cdb_tag: "vX.Y.Z"`.
- `Jager-Deployment` automatically checks out the released tag (never unpinned `main`), executes pre-flight secret validation, runs Compose, applies migrations, and executes post-deployment smoke tests.
