/**
 * Ports (interfaces) for configuration sources.
 *
 * Following hexagonal architecture:
 * - Ports define the interface contract
 * - Adapters implement the ports
 * - Domain depends only on ports
 *
 * xDD Principles:
 * - Interface segregation: focused port interfaces
 * - Dependency inversion: domain depends on abstraction
 */

import { ConfigEntry, ConfigValue } from '../domain/config';

/**
 * Port interface for configuration sources.
 *
 * Implementations: EnvConfigSource, FileConfigSource, RemoteConfigSource
 */
export interface ConfigSource {
  /**
   * Source name for debugging/logging.
   */
  readonly name: string;

  /**
   * Load all config entries from this source.
   */
  load(): Promise<ConfigEntry[]>;

  /**
   * Get a specific config value.
   */
  get(key: string): Promise<ConfigValue | undefined>;

  /**
   * Set a config value (if source is writable).
   */
  set(key: string, value: ConfigValue): Promise<void>;

  /**
   * Check if source is writable.
   */
  isWritable(): boolean;
}

/**
 * Port interface for config validation.
 */
export interface ConfigValidator<T = unknown> {
  /**
   * Validate a config value against schema.
   */
  validate(value: unknown): Promise<T>;

  /**
   * Get validation errors.
   */
  getErrors(): ConfigValidationError[];
}

/**
 * Config validation error for TypeScript.
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string[],
    public readonly value: unknown,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}
