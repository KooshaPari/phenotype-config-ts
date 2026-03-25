# ADR-001: phenotype-config-ts Architecture

**Status**: Accepted
**Date**: 2026-03-25

## Context

We need a TypeScript library for type-safe configuration management with Zod validation. The library must follow hexagonal/clean architecture principles.

## Decision

Create `phenotype-config-ts` with the following structure:

### Layered Structure

```
src/
├── domain/           # Pure business logic
│   └── config.ts    # Zod schemas, domain classes
├── ports/           # Interface definitions
│   └── config-source.ts  # ConfigSource port
├── adapters/        # External integrations
│   ├── env-adapter.ts   # Environment variables
│   └── file-adapter.ts # JSON/YAML files
└── application/     # Use cases
    └── index.ts    # ConfigManager
```

### xDD Methodologies

| Category | Methodology | Implementation |
|----------|-------------|----------------|
| **Development** | TDD | Zod schemas as executable specs |
| **Development** | BDD | Descriptive test names |
| **Development** | DDD | Bounded context for config |
| **Development** | CDD | Port/Adapter contract |
| **Design** | SOLID | Interface segregation |
| **Design** | KISS | Simple Zod schemas |

## Consequences

### Positive
- Type-safe config with Zod
- Runtime validation
- Multiple source support

### Negative
- Zod dependency
- Runtime validation overhead
