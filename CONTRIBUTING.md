# Contributing to PSMS

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Fork & clone** the repository
2. Follow the [Development Mode](#option-3-development-mode) instructions in the README
3. Make your changes on a new branch

## Code Style

- **Python**: Follow PEP 8. Use type hints where possible
- **JavaScript/React**: Use functional components and hooks
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation only
  - `refactor:` code restructuring
  - `test:` adding/updating tests

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes and add tests where appropriate
3. Run the test suite: `cd backend && python -m pytest tests/ -v`
4. Ensure the app starts cleanly: `docker-compose up --build`
5. Open a Pull Request against `main` with a clear description

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
| `web/` | React web frontend |
| `mobile/` | React Native (Expo) mobile app |
| `electron/` | Desktop wrapper with LAN sync |
| `docs/` | MkDocs documentation source |

## Questions?

Open a [Discussion](https://github.com/rohan/personal-storage-management/discussions) — we're happy to help.
