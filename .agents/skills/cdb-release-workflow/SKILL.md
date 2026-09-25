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

## Making cdb-backend Pip-Installable (for cdb-cloud)

The `pyproject.toml` at `src/backend/` is already configured with `hatchling`.
To also publish the Python package on release, add a publish step to `release.yml`:

```yaml
# Add after the existing merge job in .github/workflows/release.yml
publish-pypi:
  name: Publish cdb-backend to GHCR/PyPI
  needs: [release, merge]
  if: needs.release.outputs.new_release_published == 'true'
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
      with:
        ref: main
    - uses: astral-sh/setup-uv@v3
    - run: |
        cd src/backend
        uv build
        uv publish --token ${{ secrets.PYPI_TOKEN }}
        # Or publish to GHCR as OCI artifact if keeping private
```

Once published, `cdb-cloud` pins it:

```toml
# cdb-cloud/src/backend/pyproject.toml
dependencies = [
    "cdb-backend==1.40.0",   # bump this whenever cdb cuts a release
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
4. Verify new GitHub Release tag and CHANGELOG entry.
5. Verify GHCR images tagged `vX.Y.Z` and `production`.
6. If `cdb-cloud` exists, open a PR there bumping `cdb-backend==X.Y.Z`.

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
