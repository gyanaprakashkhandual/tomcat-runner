# Contributing

Contributions are welcome. Please read this document before opening a pull request.

## Prerequisites

- Node.js 18 or later
- VS Code 1.85 or later
- Apache Tomcat installation for manual testing

## Development Setup

```bash
git clone <repo-url>
cd tomcat-runner
npm install
npm run compile
```

Press F5 in VS Code to open an Extension Development Host with the extension loaded.

## Workflow

1. Fork the repository and create a branch from `main`
2. Make your changes with focused, well-scoped commits
3. Run `npm run lint` and `npm run compile` before pushing
4. Open a pull request with a clear description of the change and why it is needed

## Commit Style

Use short, imperative commit messages:

```
Add SSH remote deployment support
Fix port validation on Windows paths
Refactor processManager to use async/await
```

## Reporting Issues

Open a GitHub Issue and include:

- VS Code version
- Extension version
- Tomcat version
- Steps to reproduce
- Expected vs actual behaviour

## Code Style

- All source is TypeScript with strict mode enabled
- Business logic lives in `src/services/` — no VS Code UI calls there
- VS Code UI interactions belong in `src/commands/`, `src/providers/`, or `src/ui/`
- Keep new files consistent with the existing module boundaries in `STRUCTURE.md`
