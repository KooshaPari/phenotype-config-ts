# PRD — phenotype-config-ts

## Overview

`phenotype-config-ts` is a TypeScript configuration management library using Zod for schema validation and hexagonal ports (`ConfigSource`) for pluggable config backends. It supports file-based and environment-variable config sources with merge and override semantics.

## Goals

- Provide type-safe, validated configuration loading for TypeScript/Node.js Phenotype services.
- Decouple config loading from config consumption via the `ConfigSource` port.
- Support layered config with environment-specific overrides.

## Epics

### E1 — Schema Validation
- E1.1 Define config schemas with Zod.
- E1.2 Validate loaded config against schema; throw typed errors on failure.
- E1.3 Provide detailed validation error messages listing each failing field.

### E2 — Config Sources
- E2.1 FileConfigSource: loads from JSON/YAML/TOML files.
- E2.2 EnvConfigSource: loads from `process.env` with prefix filtering.
- E2.3 Allow multiple sources to be composed with explicit priority ordering.

### E3 — Layered Config
- E3.1 Base config merged with environment-specific overrides (dev, staging, prod).
- E3.2 Override keys using deep merge semantics.
- E3.3 Secret values resolved from environment at load time.

### E4 — Hexagonal Design
- E4.1 `ConfigSource` port: `load(): Promise<unknown>`.
- E4.2 `ConfigManager` domain service depends only on the port.
- E4.3 Adapters for file and env are infrastructure-layer only.

## Acceptance Criteria

- Loading a valid config file produces a fully typed config object.
- Loading an invalid config throws a `ConfigValidationError` with field-level details.
- Layered config correctly applies env overrides over base config.
