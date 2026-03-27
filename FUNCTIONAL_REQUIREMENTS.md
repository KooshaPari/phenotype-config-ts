# Functional Requirements — phenotype-config-ts

## FR-SCHEMA — Validation

| ID | Requirement |
|----|-------------|
| FR-SCHEMA-001 | The system SHALL validate loaded configuration against a Zod schema. |
| FR-SCHEMA-002 | The system SHALL throw a ConfigValidationError listing all failing fields on invalid config. |
| FR-SCHEMA-003 | The system SHALL infer TypeScript types from the Zod schema. |

## FR-SRC — Config Sources

| ID | Requirement |
|----|-------------|
| FR-SRC-001 | The system SHALL provide a FileConfigSource supporting JSON, YAML, and TOML formats. |
| FR-SRC-002 | The system SHALL provide an EnvConfigSource that maps prefixed environment variables to config keys. |
| FR-SRC-003 | The system SHALL support composing multiple sources with configurable priority order. |

## FR-LAYER — Layered Config

| ID | Requirement |
|----|-------------|
| FR-LAYER-001 | The system SHALL support base config merged with environment-specific overrides. |
| FR-LAYER-002 | The system SHALL use deep merge semantics for nested config keys. |
| FR-LAYER-003 | The system SHALL resolve secret values from environment variables at load time. |

## FR-HEX — Hexagonal Design

| ID | Requirement |
|----|-------------|
| FR-HEX-001 | The system SHALL define a ConfigSource port with a load() -> Promise<unknown> interface. |
| FR-HEX-002 | The ConfigManager domain service SHALL depend only on the ConfigSource port. |
| FR-HEX-003 | File and env adapters SHALL be in the infrastructure layer only. |
