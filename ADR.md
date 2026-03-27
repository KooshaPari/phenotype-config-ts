# Architecture Decision Records — phenotype-config-ts

## ADR-001 — Zod for Schema Validation

**Status:** Accepted  
**Date:** 2026-03-27

### Context
Configuration validation needs to be type-safe, runtime-checkable, and produce good error messages. Zod provides all three with TypeScript inference.

### Decision
All config schemas use Zod. The parsed type is inferred via `z.infer<typeof schema>`.

### Consequences
- Config types are always in sync with validation rules.
- No separate type declarations needed.
- Zod is a runtime dependency (not dev-only).

---

## ADR-002 — ConfigSource Port for Hexagonal Compliance

**Status:** Accepted  
**Date:** 2026-03-27

### Context
Services should be able to load config from files in development and from environment variables in production without changing domain code.

### Decision
Define `ConfigSource` as a TypeScript interface (port). `FileConfigSource` and `EnvConfigSource` are adapters. `ConfigManager` depends only on `ConfigSource`.

### Consequences
- Swapping config backends (e.g., AWS Parameter Store) requires only a new adapter.
- Domain/application layers have no `fs` or `process.env` imports.

---

## ADR-003 — Deep Merge for Layered Config

**Status:** Accepted  
**Date:** 2026-03-27

### Context
Shallow merge loses nested overrides (e.g., `{ db: { host: "prod" } }` would wipe `db.port`).

### Decision
Use deep merge (via `deepmerge` or equivalent) when combining base and override configs. Arrays are replaced, not concatenated.

### Consequences
- Override configs only need to specify the keys that differ from base.
- Array replacement behavior must be documented for users.
