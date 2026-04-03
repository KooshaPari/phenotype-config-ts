# phenotype-config-ts Specification

## Overview

TypeScript configuration management library with Zod validation and hexagonal architecture.

## Package

- **npm name**: `@phenotype/config-ts`
- **Stack**: TypeScript, Zod, Vitest
- **License**: MIT

## Architecture

```
src/
├── domain/     # Config domain model
├── ports/      # ConfigSource port (hexagonal)
└── adapters/   # File + env adapters
```

## Dependencies

- zod: ^3
- vitest: ^2

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## Related

- `phenotype-config` — Rust config hub
- See `ADR.md` for architecture notes

## Traceability

- CONF-001
- CONF-002
- CONF-004