/**
 * Environment variable configuration source adapter.
 *
 * Implements ConfigSource port for environment variables.
 */

import { ConfigSource } from '../ports/config-source';
import { ConfigEntry, ConfigValue } from '../domain/config';

/**
 * Environment variable config source.
 *
 * Reads configuration from process.env.
 */
export class EnvConfigSource implements ConfigSource {
  readonly name = 'env';
  private readonly prefix: string;

  constructor(prefix = 'APP_') {
    this.prefix = prefix;
  }

  async load(): Promise<ConfigEntry[]> {
    const entries: ConfigEntry[] = [];

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.prefix) && value !== undefined) {
        entries.push({
          key: this.stripPrefix(key),
          value: this.parseValue(value),
          source: this.name,
          timestamp: Date.now(),
        });
      }
    }

    return entries;
  }

  async get(key: string): Promise<ConfigValue | undefined> {
    const fullKey = this.prefix + key;
    const value = process.env[fullKey];
    if (value === undefined) return undefined;
    return this.parseValue(value);
  }

  async set(key: string, value: ConfigValue): Promise<void> {
    // Environment variables are read-only in most contexts
    throw new Error('Environment variables are read-only');
  }

  isWritable(): boolean {
    return false;
  }

  private stripPrefix(key: string): string {
    return key.slice(this.prefix.length).toLowerCase();
  }

  private parseValue(value: string): ConfigValue {
    // Try to parse as JSON for complex types
    try {
      const parsed = JSON.parse(value);
      // Return original string if not a valid JSON type
      if (typeof parsed === 'object' || Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not JSON, return as string
    }

    // Try boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Try number
    if (!isNaN(Number(value))) return Number(value);

    // Return as string
    return value;
  }
}
