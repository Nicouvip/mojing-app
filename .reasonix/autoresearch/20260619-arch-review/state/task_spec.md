# 墨境持续架构审查 — Task Spec

## Goal
As the project's architecture reviewer, continuously audit and fix code quality issues across the mojing-app codebase. Directly fix problems within scope (type safety, dependency cleanup, dead code removal, spec compliance, code smells). Do NOT write new features or adjust UI styles.

## Scope
- **TypeScript type safety**: eliminate `any` where concrete types exist; fix type imports
- **Dependency management**: verify package.json deps are referenced; move misclassified deps; remove unused deps
- **Dead code**: remove unused exports (types, functions, constants, components)
- **Spec compliance**: naming conventions, file organization, import patterns per 三-开发规范.md
- **Code smells**: oversized components, inconsistent abstraction, duplicated patterns
- **Security (P0)**: hardcoded API keys, missing .env files

## Non-goals
- New feature development
- UI style/visual design changes
- API business logic implementation
- Runtime behavior changes (unless fixing a type error)

## Success criteria
1. `tsc --noEmit` passes with zero errors after every change batch
2. All P0 security issues resolved (API key hardcoding → env-only)
3. Zero unused exports in src/lib/types.ts, src/lib/utils.ts
4. No `any` type that could be replaced with a concrete type
5. At least 3 code smell items addressed (e.g., extract function, reduce nesting, deduplicate)
6. Spec-compliance issues (hardcoded colors, naming) cataloged

## Verification gates
- `tsc --noEmit` after every change
- Import grep for `any` remaining
- Package.json grep for unused deps
- Visual inspection of each changed file

## Allowed operations
- read/write source files
- pnpm install/remove
- grep/search for patterns
- tsc check
