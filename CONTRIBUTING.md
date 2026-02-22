# Contributing to PSMS

Thanks for your interest in contributing! This document covers our branching strategy, development workflow, and release process.

## Branching Strategy (Git Flow)

We use a structured Git Flow model to keep `main` stable and `develop` as the integration branch.

```
main ─────────●────────────●────────── (always deployable, tagged releases)
              ↑            ↑
develop ──●───┴──●──●──●───┴──●────── (integration branch)
          ↑         ↑
feature/* ┘  feature/┘
```

| Branch | Purpose | Created From | Merges Into |
|--------|---------|--------------|-------------|
| `main` | Production releases only | — | — |
| `develop` | Integration & next-release prep | `main` | `main` (via release branch) |
| `feature/*` | New features | `develop` | `develop` |
| `release/*` | Release stabilization & QA | `develop` | `main` + `develop` |
| `hotfix/*` | Urgent production fixes | `main` | `main` + `develop` |

### Branch Naming

```
feature/short-description    # e.g. feature/export-import
fix/short-description        # e.g. fix/qr-routing
hotfix/short-description     # e.g. hotfix/login-crash
release/vX.Y.Z               # e.g. release/v1.1.0
```

## Development Workflow

### 1. Start a Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/my-feature
```

### 2. Work & Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code restructuring (no behavior change) |
| `test:` | Adding or updating tests |
| `chore:` | Build, CI, dependency updates |

```bash
git add -A
git commit -m "feat: add archive export endpoint"
```

### 3. Open a Pull Request

```bash
git push origin feature/my-feature
```

Then open a PR against `develop`. The CI pipeline will run automatically:
- ✅ Backend tests (pytest)
- ✅ Frontend build check (vite)

### 4. Code Review & Merge

- At least one approval required
- All CI checks must pass
- Squash-merge into `develop`

## Code Style

- **Python**: PEP 8, type hints where possible
- **JavaScript/React**: Functional components, hooks, ES6+
- **TypeScript**: Strict mode, proper type annotations

## Running Tests

```bash
# Backend (in-memory SQLite, no external deps)
cd backend
source venv/bin/activate
python -m pytest tests/ -v --noconftest

# Web frontend build
cd web
npm run build
```

## Release Process

See the full SOP at [docs/release-process.md](docs/release-process.md). Quick summary:

1. Create `release/vX.Y.Z` from `develop`
2. Final QA, bump version numbers, fix last bugs
3. Merge into `main` and `develop`
4. Tag `vX.Y.Z` on `main` → CI builds & publishes automatically
5. Create GitHub Release from the tag

## Reporting Issues

When filing an issue, please include:

- Steps to reproduce the bug
- Expected vs actual behavior
- Your OS and browser/app version
- Any error messages or logs

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `backend/` | FastAPI API server, models, and business logic |
| `web/` | React web frontend (Vite) |
| `mobile/` | React Native (Expo) mobile app |
| `electron/` | Desktop wrapper with LAN sync |
| `docs/` | MkDocs documentation source |
| `landing/` | GitHub Pages landing page |

## Questions?

Open a [Discussion](https://github.com/rohanbatrain/Storage-Management-System/discussions) — we're happy to help.
