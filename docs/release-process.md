# Release Process

Step-by-step standard operating procedure for releasing a new version of SMS.

## Overview

Releases follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (v2.0.0) — breaking changes
- **MINOR** (v1.1.0) — new features, backward compatible
- **PATCH** (v1.0.1) — bug fixes only

## Release Lifecycle

```
develop ──→ release/vX.Y.Z ──→ main (tagged) ──→ CI builds automatically
                │                    │
                └─── merge back ─────┘── into develop
```

## Standard Release (Minor / Major)

### Step 1: Create Release Branch

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0
```

### Step 2: Final QA & Polish

On the release branch, perform:

- [ ] Run full test suite: `cd backend && python -m pytest tests/ -v --noconftest`
- [ ] Build and test web: `cd web && npm run build`
- [ ] Test mobile: `cd mobile && npx expo start`
- [ ] Test Docker: `docker-compose up --build`
- [ ] Update version numbers (if present in package.json files, etc.)
- [ ] Update CHANGELOG.md (if applicable)
- [ ] Fix any remaining bugs (commit directly to the release branch)

### Step 3: Merge to Main

```bash
git checkout main
git pull origin main
git merge --no-ff release/v1.1.0 -m "release: v1.1.0"
```

### Step 4: Tag the Release

```bash
git tag -a v1.1.0 -m "v1.1.0 — Description of key changes"
git push origin main --tags
```

> The `v*` tag push triggers the CI pipeline which automatically:
> - Runs tests
> - Builds backend executables (macOS, Windows, Linux)
> - Packages Electron apps
> - Publishes Expo mobile update
> - Creates a GitHub Release with artifacts

### Step 5: Merge Back to Develop

```bash
git checkout develop
git merge --no-ff release/v1.1.0 -m "merge: release/v1.1.0 back to develop"
git push origin develop
```

### Step 6: Clean Up

```bash
git branch -d release/v1.1.0
git push origin --delete release/v1.1.0
```

### Step 7: Verify GitHub Release

1. Go to [Releases](https://github.com/rohanbatrain/Storage-Management-System/releases)
2. Verify the auto-generated release has all artifacts
3. Edit the release notes if needed

## Hotfix Release (Patch)

For urgent production bugs:

### Step 1: Branch from Main

```bash
git checkout main
git pull origin main
git checkout -b hotfix/v1.0.1
```

### Step 2: Fix & Test

```bash
# Make the fix
git commit -m "fix: description of the fix"

# Run tests
cd backend && python -m pytest tests/ -v --noconftest
```

### Step 3: Merge & Tag

```bash
git checkout main
git merge --no-ff hotfix/v1.0.1 -m "hotfix: v1.0.1"
git tag -a v1.0.1 -m "v1.0.1 — Hotfix: description"
git push origin main --tags
```

### Step 4: Merge to Develop

```bash
git checkout develop
git merge --no-ff hotfix/v1.0.1 -m "merge: hotfix/v1.0.1 to develop"
git push origin develop
```

### Step 5: Clean Up

```bash
git branch -d hotfix/v1.0.1
git push origin --delete hotfix/v1.0.1
```

## Branch Protection Recommendations

Configure these in GitHub → Settings → Branches → Branch protection rules:

### `main` Branch

- ✅ Require pull request before merging
- ✅ Require at least 1 approval
- ✅ Require status checks to pass (CI: `backend-tests`, `frontend-build`)
- ✅ Require branches to be up to date before merging
- ✅ Do not allow deletions

### `develop` Branch

- ✅ Require pull request before merging
- ✅ Require status checks to pass (CI: `backend-tests`, `frontend-build`)
- ✅ Do not allow deletions

## CI/CD Pipeline Summary

| Trigger | Workflow | What Runs |
|---------|----------|-----------|
| Push to `develop` | `ci.yml` | Backend tests + frontend build |
| PR to `main`/`develop` | `ci.yml` | Backend tests + frontend build |
| Tag `v*` pushed | `release.yml` | Tests → Build backend → Build Electron → Publish mobile → GitHub Release |
| Push to `main` | `pages.yml` | Build MkDocs + landing page → Deploy to GitHub Pages |
