# Phenotype Config TS Specification

> Comprehensive specification for the phenotype-config-ts configuration management library

**Document Version**: 2.0  
**Status**: Draft  
**Last Updated**: 2026-04-02  
**Maintainer**: Phenotype Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture](#3-architecture)
4. [Configuration Schema System](#4-configuration-schema-system)
5. [Configuration Sources](#5-configuration-sources)
6. [Configuration API](#6-configuration-api)
7. [Hot Reload Implementation](#7-hot-reload-implementation)
8. [Secret Management](#8-secret-management)
9. [Validation System](#9-validation-system)
10. [Type System](#10-type-system)
11. [Feature Flags Integration](#11-feature-flags-integration)
12. [Performance Requirements](#12-performance-requirements)
13. [Security Considerations](#13-security-considerations)
14. [Testing Strategy](#14-testing-strategy)
15. [Error Handling](#15-error-handling)
16. [Configuration Examples](#16-configuration-examples)
17. [API Reference](#17-api-reference)
18. [References](#18-references)

---

## 1. Executive Summary

phenotype-config-ts is a comprehensive configuration management library for TypeScript applications, providing:

- **Multi-source configuration**: Files, environment variables, secret managers, and remote servers
- **Type-safe configuration**: Full TypeScript type inference from schemas
- **Runtime validation**: Comprehensive validation with detailed error messages
- **Hot reloading**: Dynamic configuration updates without restarts
- **Secret management**: Secure integration with HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and GCP Secret Manager
- **Feature flags**: Built-in support for feature flag systems

### Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| Multi-Source Config | Files, ENV, Vault, AWS SM, Azure KV, GCP SM | Planned |
| Type Safety | Full TypeScript type inference | Planned |
| Schema Validation | Zod-based validation | Planned |
| Hot Reloading | File watching + remote updates | Planned |
| Secret Injection | Template-based secret resolution | Planned |
| Feature Flags | Integration with major flag systems | Planned |
| Caching | Multi-level caching for performance | Planned |

### Target Use Cases

1. **Microservices**: Centralized configuration across service mesh
2. **Serverless**: Environment-based configuration for Lambda/Functions
3. **Containerized Apps**: Kubernetes-native configuration management
4. **Multi-tenant SaaS**: Per-tenant configuration with isolation
5. **Edge Deployment**: Lightweight configuration for edge computing

---

## 2. System Overview

### 2.1 System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          phenotype-config-ts                            │
│                         System Context Diagram                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────────┐                                                      │
│   │  Application │                                                      │
│   │   (Node.js)  │◀─────────────────────────────────────┐            │
│   └───────┬──────┘                                      │            │
│           │ get('database.url')                         │            │
│           │                                             │            │
│   ┌───────▼──────────────────────────────────────┐    │            │
│   │          phenotype-config-ts                   │    │            │
│   │  ┌──────────────┐  ┌──────────────────────┐  │    │            │
│   │  │ ConfigManager │  │   Schema Validator   │  │    │            │
│   │  │              │  │      (Zod)          │  │    │            │
│   │  │ - merge()    │  │ - validate()         │  │    │            │
│   │  │ - get()      │  │ - infer types        │  │    │            │
│   │  │ - watch()    │  │ - format errors      │  │    │            │
│   │  └──────────────┘  └──────────────────────┘  │    │            │
│   │           │                                  │    │            │
│   │  ┌────────▼────────┐  ┌──────────────┐      │    │            │
│   │  │  Source Loader  │  │   Caching    │      │    │            │
│   │  │                 │  │   (LRU)      │      │    │            │
│   │  │ - FileSource    │  │              │      │    │            │
│   │  │ - EnvSource     │  │ - TTL: 5min  │      │    │            │
│   │  │ - VaultSource   │  │ - Max: 1000  │      │    │            │
│   │  │ - RemoteSource  │  └──────────────┘      │    │            │
│   │  └─────────────────┘                        │    │            │
│   └──────────────────────────────────────────────┘    │            │
│                      │                                 │            │
│           ┌──────────┼──────────┬──────────┐          │            │
│           ▼          ▼          ▼          ▼          │            │
│      ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │            │
│      │  File  │ │  ENV   │ │ Secret │ │ Remote │     │            │
│      │ System │ │  Vars  │ │Manager │ │ Server │     │            │
│      └────────┘ └────────┘ └────────┘ └────────┘     │            │
│           │          │          │          │            │            │
│           ▼          ▼          ▼          ▼            │            │
│      config/    .env    HashiCorp   Consul            │            │
│      default.yaml      Vault       etcd               │            │
│      prod.yaml         AWS SM      Spring Cloud       │            │
│                        Azure KV                       │            │
│                        GCP SM                         │            │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │                     Notifications                          │    │
│   │  on('change') ◀───────────────────────────────────────────┘    │
│   │  on('error')                                                   │
│   │  on('reload')                                                  │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Overview

| Component | Responsibility | Interface |
|-----------|----------------|-----------|
| `ConfigManager` | Main entry point, orchestrates sources | `get()`, `set()`, `watch()`, `load()` |
| `ConfigSource` | Abstraction for configuration sources | `load()`, `watch?()`, `priority` |
| `SchemaValidator` | Validation using Zod schemas | `validate()`, `safeParse()` |
| `TypeGenerator` | TypeScript type generation | `infer()`, `toJsonSchema()` |
| `SecretResolver` | Secret resolution from vaults | `resolve()`, `getSecret()` |
| `HotReloader` | File watching and updates | `start()`, `stop()`, `on('change')` |
| `CacheManager` | Multi-level caching | `get()`, `set()`, `invalidate()` |

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        phen otype-config-ts Architecture                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         Public API Layer                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │  ConfigManager │  │  ConfigBuilder │  │   TypedAccessor     │  │   │
│  │  │              │  │              │  │                     │  │   │
│  │  │ - load()     │  │ - from()     │  │ - get<T>(path)      │  │   │
│  │  │ - get()      │  │ - addSource()│  │ - set<T>(path, val) │  │   │
│  │  │ - watch()    │  │ - withSchema()│  │ - has(path)         │  │   │
│  │  │ - validate() │  │ - build()    │  │ - getAll()          │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────▼─────────────────────────────────┐   │
│  │                       Core Services Layer                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │   │
│  │  │    Source    │  │   Schema     │  │   Cache Manager      │   │   │
│  │  │   Resolver   │  │   Validator  │  │                      │   │   │
│  │  │              │  │              │  │ - LRU cache          │   │   │
│  │  │ - resolve()  │  │ - zod schema │  │ - TTL management     │   │   │
│  │  │ - merge()    │  │ - validate() │  │ - invalidate()       │   │   │
│  │  │ - priority() │  │ - coerce()   │  │ - warm()             │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │   │
│  │  │    Secret    │  │    Hot       │  │   Feature Flag       │   │   │
│  │  │   Resolver   │  │   Reloader   │  │   Integration        │   │   │
│  │  │              │  │              │  │                      │   │   │
│  │  │ - inject()   │  │ - watch()    │  │ - isEnabled()        │   │   │
│  │  │ - resolve()  │  │ - poll()     │  │ - getVariant()       │   │   │
│  │  │ - getValue() │  │ - reload()   │  │ - track()            │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  ┌─────────────────────────────────▼─────────────────────────────────┐   │
│  │                        Source Adapters Layer                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │   File   │ │   Env    │ │  Vault   │ │  Remote  │ │ Custom │ │   │
│  │  │  Source  │ │  Source  │ │  Source  │ │  Source  │ │ Source │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│  ┌─────────────────────────────────▼─────────────────────────────────┐   │
│  │                        Infrastructure Layer                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │   FS     │ │ process. │ │ Vault    │ │ Consul   │ │ Feature│ │   │
│  │  │  Module  │ │   env    │ │  Client  │ │  Client  │ │  Flag  │ │   │
│  │  │          │ │          │ │          │ │          │ │ Client │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                         │   │
│  │  │  YAML    │ │   TOML   │ │   JSON   │                         │   │
│  │  │  Parser  │ │  Parser  │ │  Parser  │                         │   │
│  │  └──────────┘ └──────────┘ └──────────┘                         │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
Configuration Load Flow:

1. Application calls ConfigManager.load()
   │
   ▼
2. Source Resolver loads from all sources (in priority order)
   │
   ├─► CLI Arguments (Priority 1)
   ├─► Environment Variables (Priority 2)
   ├─► Secret Manager (Priority 3)
   ├─► Environment File (Priority 4)
   └─► Default File (Priority 5)
   │
   ▼
3. Merge Strategy merges all sources
   │
   ├─► Deep merge objects
   ├─► Higher priority overrides lower
   └─► Arrays replaced (not merged)
   │
   ▼
4. Secret Resolver processes template strings
   │
   ├─► ${vault:path:key} → resolved value
   ├─► ${aws:secret-id:key} → resolved value
   └─► ${env:VAR_NAME} → resolved value
   │
   ▼
5. Schema Validator validates merged config
   │
   ├─► Type checking
   ├─► Constraint validation
   ├─► Default value application
   └─► Coercion and transforms
   │
   ▼
6. Cache Manager stores validated config
   │
   ▼
7. ConfigManager emits 'loaded' event
   │
   ▼
8. Application can now access config via get()
```

---

## 4. Configuration Schema System

### 4.1 Schema Definition

```typescript
import { z } from 'zod';
import { createConfigSchema } from 'phenotype-config-ts';

// Define configuration schema with full type safety
const ServerSchema = z.object({
  host: z.string().default('0.0.0.0'),
  port: z.number().int().min(1).max(65535).default(8080),
  ssl: z.object({
    enabled: z.boolean().default(false),
    cert: z.string().optional(),
    key: z.string().optional(),
  }).default({ enabled: false }),
  timeout: z.number().default(30000),  // milliseconds
  keepAlive: z.boolean().default(true),
});

const DatabaseSchema = z.object({
  url: z.string().url(),
  poolSize: z.number().int().min(1).max(100).default(10),
  ssl: z.boolean().default(true),
  connectionTimeout: z.number().default(5000),
  maxRetries: z.number().default(3),
  migrations: z.object({
    autoRun: z.boolean().default(false),
    directory: z.string().default('./migrations'),
  }).default({}),
});

const LoggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'pretty']).default('json'),
  outputs: z.array(z.enum(['console', 'file', 'remote'])).default(['console']),
  file: z.object({
    path: z.string().optional(),
    maxSize: z.string().default('10MB'),
    maxFiles: z.number().default(5),
  }).optional(),
});

const FeatureFlagsSchema = z.record(z.boolean()).default({});

// Main configuration schema
const ConfigSchema = z.object({
  app: z.object({
    name: z.string().default('phenotype-app'),
    version: z.string().default('1.0.0'),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
  }).default({}),
  
  server: ServerSchema.default({}),
  
  database: DatabaseSchema,
  
  logging: LoggingSchema.default({}),
  
  cache: z.object({
    type: z.enum(['memory', 'redis', 'memcached']).default('memory'),
    ttl: z.number().default(300),  // seconds
    maxSize: z.number().default(1000),
  }).default({}),
  
  features: FeatureFlagsSchema,
  
  security: z.object({
    cors: z.object({
      enabled: z.boolean().default(true),
      origins: z.array(z.string()).default(['*']),
    }).default({}),
    rateLimit: z.object({
      enabled: z.boolean().default(true),
      windowMs: z.number().default(60000),
      max: z.number().default(100),
    }).default({}),
  }).default({}),
});

// Export type for application use
type Config = z.infer<typeof ConfigSchema>;

// Create schema with metadata for better error messages
const ConfigSchemaWithMetadata = ConfigSchema.describe('Application Configuration');
```

### 4.2 Advanced Schema Patterns

```typescript
// Discriminated unions for type-safe variants
const ConfigSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('file'),
    path: z.string(),
    format: z.enum(['yaml', 'json', 'toml']).optional(),
    watch: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('env'),
    prefix: z.string().optional(),
    separator: z.string().default('__'),
  }),
  z.object({
    type: z.literal('vault'),
    address: z.string().url(),
    path: z.string(),
    mount: z.string().default('secret'),
    auth: z.discriminatedUnion('method', [
      z.object({ method: z.literal('token'), token: z.string() }),
      z.object({ method: z.literal('approle'), roleId: z.string(), secretId: z.string() }),
      z.object({ method: z.literal('kubernetes'), role: z.string(), jwtPath: z.string().optional() }),
    ]),
  }),
  z.object({
    type: z.literal('aws-sm'),
    region: z.string(),
    secretId: z.string(),
    versionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('azure-kv'),
    vaultUrl: z.string().url(),
    secretName: z.string(),
  }),
  z.object({
    type: z.literal('gcp-sm'),
    projectId: z.string(),
    secretId: z.string(),
    version: z.string().default('latest'),
  }),
]);

type ConfigSource = z.infer<typeof ConfigSourceSchema>;

// Transform schemas for parsing
const PortSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') return parseInt(val, 10);
    return val;
  },
  z.number().int().min(1).max(65535)
);

const DurationSchema = z.string().transform((val) => {
  const match = val.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) throw new Error('Invalid duration format');
  const [, value, unit] = match;
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return parseInt(value, 10) * multipliers[unit];
});

// Recursive schemas for nested structures
const FeatureFlagSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    enabled: z.boolean().default(false),
    description: z.string().optional(),
    rollout: z.object({
      percentage: z.number().min(0).max(100).default(0),
      salt: z.string().optional(),
    }).optional(),
    prerequisites: z.array(FeatureFlagSchema).optional(),
    conditions: z.array(z.object({
      attribute: z.string(),
      operator: z.enum(['eq', 'ne', 'gt', 'lt', 'in', 'contains']),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any())]),
    })).optional(),
  })
);

// Refinements for complex validation
const ValidConfigSchema = ConfigSchema.refine(
  (data) => {
    // Ensure SSL is enabled in production if cert is provided
    if (data.app.environment === 'production' && data.server.ssl.cert) {
      return data.server.ssl.enabled;
    }
    return true;
  },
  {
    message: 'SSL must be enabled in production when cert is provided',
    path: ['server', 'ssl', 'enabled'],
  }
).refine(
  (data) => {
    // Ensure database URL is not localhost in production
    if (data.app.environment === 'production') {
      return !data.database.url.includes('localhost');
    }
    return true;
  },
  {
    message: 'Production database should not use localhost',
    path: ['database', 'url'],
  }
);

// Brand types for nominal typing
const DatabaseUrl = z.string().url().brand<'DatabaseUrl'>();
type DatabaseUrl = z.infer<typeof DatabaseUrl>;

const ApiKey = z.string().min(32).brand<'ApiKey'>();
type ApiKey = z.infer<typeof ApiKey>;
```

### 4.3 Schema Composition

```typescript
// Reusable schema components
const RetryPolicySchema = z.object({
  maxRetries: z.number().int().min(0).default(3),
  backoff: z.enum(['fixed', 'exponential', 'linear']).default('exponential'),
  initialDelayMs: z.number().default(1000),
  maxDelayMs: z.number().default(60000),
  retryableStatuses: z.array(z.number()).default([500, 502, 503, 504]),
});

const TimeoutSchema = z.object({
  connect: z.number().default(5000),
  read: z.number().default(30000),
  write: z.number().default(30000),
});

const ConnectionPoolSchema = z.object({
  min: z.number().int().min(0).default(1),
  max: z.number().int().min(1).default(10),
  acquireTimeout: z.number().default(60000),
  idleTimeout: z.number().default(300000),
  evictionInterval: z.number().default(1000),
});

// Compose into service-specific schemas
const HttpClientSchema = z.object({
  baseUrl: z.string().url(),
  timeout: TimeoutSchema.default({}),
  retry: RetryPolicySchema.default({}),
  headers: z.record(z.string()).default({}),
});

const DatabaseClientSchema = z.object({
  url: DatabaseUrl,
  pool: ConnectionPoolSchema.default({}),
  ssl: z.boolean().default(true),
  queryTimeout: z.number().default(30000),
  migration: z.object({
    tableName: z.string().default('migrations'),
    schemaName: z.string().optional(),
  }).default({}),
});

// Merge schemas
const ServiceConfigSchema = z.intersection(
  z.object({
    name: z.string(),
    version: z.string(),
  }),
  z.object({
    http: HttpClientSchema.optional(),
    database: DatabaseClientSchema.optional(),
  })
);
```

---

## 5. Configuration Sources

### 5.1 Source Priority Hierarchy

```typescript
// Configuration source priority (highest to lowest)
enum SourcePriority {
  CLI_ARGS = 1,           // --port 8080
  ENVIRONMENT_VARS = 2,   // PORT=8080
  SECRET_MANAGER = 3,     // vault://secret/data/db
  REMOTE_CONFIG = 4,      // consul://config/app
  ENVIRONMENT_FILE = 5,   // config/production.yaml
  DEFAULT_FILE = 6,       // config/default.yaml
  CODE_DEFAULTS = 7,      // schema defaults
}

// Source configuration interface
interface SourceConfig {
  type: string;
  priority: number;
  enabled: boolean;
  options: Record<string, unknown>;
}

// Default source configuration
const defaultSources: SourceConfig[] = [
  {
    type: 'cli',
    priority: SourcePriority.CLI_ARGS,
    enabled: true,
    options: {},
  },
  {
    type: 'env',
    priority: SourcePriority.ENVIRONMENT_VARS,
    enabled: true,
    options: { prefix: 'PH_', separator: '__' },
  },
  {
    type: 'file',
    priority: SourcePriority.ENVIRONMENT_FILE,
    enabled: true,
    options: { path: 'config/{environment}.yaml' },
  },
  {
    type: 'file',
    priority: SourcePriority.DEFAULT_FILE,
    enabled: true,
    options: { path: 'config/default.yaml' },
  },
];
```

### 5.2 File Source Implementation

```typescript
import { readFile, watch } from 'fs/promises';
import { parse as parseYAML } from 'yaml';
import { parse as parseTOML } from '@iarna/toml';

interface FileSourceOptions {
  path: string;
  format?: 'yaml' | 'json' | 'toml' | 'auto';
  encoding?: BufferEncoding;
  watch?: boolean;
  required?: boolean;
  interpolate?: boolean;
}

class FileSource implements ConfigSource {
  private options: Required<FileSourceOptions>;
  private watchers: Array<() => void> = [];
  
  constructor(options: FileSourceOptions) {
    this.options = {
      format: 'auto',
      encoding: 'utf-8',
      watch: false,
      required: false,
      interpolate: true,
      ...options,
    };
  }
  
  async load(): Promise<Record<string, unknown> | null> {
    try {
      const content = await readFile(this.options.path, this.options.encoding);
      
      // Interpolate environment variables
      const interpolated = this.options.interpolate
        ? this.interpolateEnvVars(content)
        : content;
      
      // Parse based on format
      const format = this.detectFormat();
      
      switch (format) {
        case 'yaml':
          return parseYAML(interpolated);
        case 'json':
          return JSON.parse(interpolated);
        case 'toml':
          return parseTOML(interpolated);
        default:
          throw new Error(`Unknown format: ${format}`);
      }
    } catch (error) {
      if (this.options.required) {
        throw new ConfigLoadError(
          `Failed to load required config file: ${this.options.path}`,
          { cause: error }
        );
      }
      return null;
    }
  }
  
  watch(callback: () => void): void {
    if (!this.options.watch) return;
    
    const watcher = watchFile(this.options.path, { interval: 1000 }, () => {
      callback();
    });
    
    this.watchers.push(() => watcher.close());
  }
  
  stopWatching(): void {
    for (const stop of this.watchers) {
      stop();
    }
    this.watchers = [];
  }
  
  private detectFormat(): 'yaml' | 'json' | 'toml' {
    if (this.options.format !== 'auto') {
      return this.options.format;
    }
    
    const ext = this.options.path.toLowerCase();
    if (ext.endsWith('.yaml') || ext.endsWith('.yml')) return 'yaml';
    if (ext.endsWith('.json')) return 'json';
    if (ext.endsWith('.toml')) return 'toml';
    
    // Try to detect from content
    throw new Error('Cannot auto-detect format, please specify');
  }
  
  private interpolateEnvVars(content: string): string {
    // Support ${ENV_VAR} and ${ENV_VAR:-default} syntax
    return content.replace(/\$\{([^}]+)\}/g, (match, expr) => {
      const [varName, defaultValue] = expr.split(':-');
      const value = process.env[varName];
      
      if (value !== undefined) {
        return value;
      }
      
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      
      throw new Error(`Environment variable ${varName} not found`);
    });
  }
  
  get priority(): number {
    return SourcePriority.ENVIRONMENT_FILE;
  }
}
```

### 5.3 Environment Variable Source

```typescript
interface EnvSourceOptions {
  prefix?: string;
  separator?: string;
  parseValues?: boolean;
  includeProcessEnv?: boolean;
  transform?: (key: string, value: string) => [string, unknown] | null;
}

class EnvironmentSource implements ConfigSource {
  private options: Required<EnvSourceOptions>;
  
  constructor(options: EnvSourceOptions = {}) {
    this.options = {
      prefix: '',
      separator: '__',
      parseValues: true,
      includeProcessEnv: true,
      transform: (key, value) => [key, value],
      ...options,
    };
  }
  
  async load(): Promise<Record<string, unknown>> {
    const config: Record<string, unknown> = {};
    const env = this.options.includeProcessEnv ? process.env : {};
    
    for (const [key, value] of Object.entries(env)) {
      if (!value) continue;
      
      // Check prefix
      if (this.options.prefix && !key.startsWith(this.options.prefix)) {
        continue;
      }
      
      // Transform key
      const transformed = this.transformKey(key);
      if (!transformed) continue;
      
      // Parse value
      const parsedValue = this.options.parseValues
        ? this.parseValue(value)
        : value;
      
      // Apply custom transform
      const result = this.options.transform(transformed, value);
      if (!result) continue;
      
      const [path, finalValue] = result;
      
      // Set nested value
      this.setNestedValue(config, path.split('.'), finalValue);
    }
    
    return config;
  }
  
  private transformKey(key: string): string | null {
    let transformed = key;
    
    // Remove prefix
    if (this.options.prefix) {
      transformed = transformed.slice(this.options.prefix.length);
    }
    
    // Convert to lowercase and split by separator
    return transformed
      .toLowerCase()
      .split(this.options.separator)
      .join('.');
  }
  
  private parseValue(value: string): unknown {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Null/undefined
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    // Number
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    
    // JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    return value;
  }
  
  private setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
    let current: Record<string, unknown> = obj;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    
    current[path[path.length - 1]] = value;
  }
  
  get priority(): number {
    return SourcePriority.ENVIRONMENT_VARS;
  }
}
```

### 5.4 Secret Manager Sources

```typescript
// Base interface for secret sources
interface SecretSource extends ConfigSource {
  getSecret(path: string, key?: string): Promise<unknown>;
}

// HashiCorp Vault implementation
interface VaultSourceOptions {
  address: string;
  token?: string;
  auth?: {
    method: 'token' | 'approle' | 'kubernetes';
    credentials: Record<string, string>;
  };
  namespace?: string;
  cacheTtl?: number;
}

class VaultSource implements SecretSource {
  private client: VaultClient;
  private cache: Map<string, { value: unknown; expiry: number }> = new Map();
  private options: VaultSourceOptions & { cacheTtl: number };
  
  constructor(options: VaultSourceOptions) {
    this.options = {
      cacheTtl: 5 * 60 * 1000,  // 5 minutes
      ...options,
    };
    this.client = new VaultClient(options);
  }
  
  async authenticate(): Promise<void> {
    if (this.options.auth) {
      switch (this.options.auth.method) {
        case 'token':
          this.client.token = this.options.auth.credentials.token;
          break;
        case 'approle':
          await this.client.approleLogin(
            this.options.auth.credentials.roleId,
            this.options.auth.credentials.secretId
          );
          break;
        case 'kubernetes':
          await this.client.kubernetesLogin(
            this.options.auth.credentials.role,
            this.options.auth.credentials.jwtPath
          );
          break;
      }
    }
  }
  
  async load(): Promise<Record<string, unknown>> {
    // Load all secrets from configured paths
    const secrets: Record<string, unknown> = {};
    
    // This is a placeholder - actual implementation would
    // load from configured paths
    return secrets;
  }
  
  async getSecret(path: string, key?: string): Promise<unknown> {
    const cacheKey = `${path}:${key || '__all__'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const result = await this.client.read(path);
    const value = key ? result.data.data[key] : result.data.data;
    
    this.cache.set(cacheKey, {
      value,
      expiry: Date.now() + this.options.cacheTtl,
    });
    
    return value;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  get priority(): number {
    return SourcePriority.SECRET_MANAGER;
  }
}

// AWS Secrets Manager implementation
interface AWSSMSourceOptions {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  cacheTtl?: number;
}

class AWSSMSource implements SecretSource {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: unknown; expiry: number }> = new Map();
  private cacheTtl: number;
  
  constructor(options: AWSSMSourceOptions) {
    this.client = new SecretsManagerClient({
      region: options.region,
      credentials: options.accessKeyId && options.secretAccessKey
        ? {
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
          }
        : undefined,
    });
    this.cacheTtl = options.cacheTtl || 5 * 60 * 1000;
  }
  
  async load(): Promise<Record<string, unknown>> {
    return {};  // Lazy loading
  }
  
  async getSecret(secretId: string, key?: string): Promise<unknown> {
    const cacheKey = `${secretId}:${key || '__all__'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await this.client.send(command);
    
    let value: unknown;
    if (response.SecretString) {
      value = JSON.parse(response.SecretString);
    } else if (response.SecretBinary) {
      value = Buffer.from(response.SecretBinary as Uint8Array).toString('utf-8');
    }
    
    if (key && typeof value === 'object' && value !== null) {
      value = (value as Record<string, unknown>)[key];
    }
    
    this.cache.set(cacheKey, {
      value,
      expiry: Date.now() + this.cacheTtl,
    });
    
    return value;
  }
  
  get priority(): number {
    return SourcePriority.SECRET_MANAGER;
  }
}
```

---

## 6. Configuration API

### 6.1 ConfigManager Class

```typescript
import { EventEmitter } from 'events';
import { ZodType, infer as ZodInfer } from 'zod';

interface ConfigManagerOptions<TSchema extends ZodType> {
  schema: TSchema;
  sources?: ConfigSource[];
  cache?: CacheOptions;
  hotReload?: HotReloadOptions;
  secretResolver?: SecretResolverOptions;
}

interface CacheOptions {
  enabled?: boolean;
  ttl?: number;
  maxSize?: number;
}

interface HotReloadOptions {
  enabled?: boolean;
  debounceMs?: number;
  pollInterval?: number;
}

interface SecretResolverOptions {
  sources?: SecretSource[];
  templates?: Record<string, (match: string) => Promise<unknown>>;
}

interface ConfigChangeEvent<T> {
  type: 'value' | 'structure' | 'reload';
  path?: string;
  previousValue?: unknown;
  currentValue?: unknown;
  timestamp: Date;
  source?: string;
}

type ConfigChangeListener<T> = (event: ConfigChangeEvent<T>) => void;

declare interface ConfigManager<T> {
  on(event: 'change', listener: ConfigChangeListener<T>): this;
  on(event: 'error', listener: (error: ConfigError) => void): this;
  on(event: 'load', listener: (config: T) => void): this;
  on(event: 'reload', listener: (config: T) => void): this;
  
  once(event: 'change', listener: ConfigChangeListener<T>): this;
  once(event: 'error', listener: (error: ConfigError) => void): this;
  once(event: 'load', listener: (config: T) => void): this;
  once(event: 'reload', listener: (config: T) => void): this;
}

class ConfigManager<TSchema extends ZodType> extends EventEmitter {
  private schema: TSchema;
  private sources: ConfigSource[];
  private config: ZodInfer<TSchema> | null = null;
  private cache: CacheManager | null = null;
  private hotReloader: HotReloader | null = null;
  private secretResolver: SecretResolver | null = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  
  constructor(options: ConfigManagerOptions<TSchema>) {
    super();
    
    this.schema = options.schema;
    this.sources = options.sources || this.defaultSources();
    
    // Initialize cache
    if (options.cache?.enabled !== false) {
      this.cache = new CacheManager({
        ttl: options.cache?.ttl,
        maxSize: options.cache?.maxSize,
      });
    }
    
    // Initialize hot reload
    if (options.hotReload?.enabled) {
      this.hotReloader = new HotReloader({
        debounceMs: options.hotReload.debounceMs,
        pollInterval: options.hotReload.pollInterval,
        onChange: () => this.reload(),
      });
    }
    
    // Initialize secret resolver
    if (options.secretResolver) {
      this.secretResolver = new SecretResolver(options.secretResolver);
    }
  }
  
  // Main load method
  async load(): Promise<void> {
    // Prevent concurrent loads
    if (this.loadPromise) {
      return this.loadPromise;
    }
    
    this.loadPromise = this.doLoad();
    
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }
  
  private async doLoad(): Promise<void> {
    // Load from all sources in priority order
    let merged: Record<string, unknown> = {};
    
    // Sort by priority (highest first)
    const sortedSources = [...this.sources].sort(
      (a, b) => a.priority - b.priority
    );
    
    for (const source of sortedSources) {
      try {
        const data = await source.load();
        if (data) {
          merged = deepMerge(merged, data);
        }
      } catch (error) {
        this.emit('error', new ConfigLoadError(
          `Failed to load from source: ${source.constructor.name}`,
          { cause: error, source }
        ));
      }
    }
    
    // Resolve secrets
    if (this.secretResolver) {
      merged = await this.secretResolver.resolve(merged);
    }
    
    // Validate
    const parseResult = this.schema.safeParse(merged);
    
    if (!parseResult.success) {
      const error = new ConfigValidationError(
        'Configuration validation failed',
        { issues: parseResult.error.issues }
      );
      this.emit('error', error);
      throw error;
    }
    
    this.config = parseResult.data;
    this.isLoaded = true;
    
    // Update cache
    if (this.cache) {
      this.cache.set('__config__', this.config);
    }
    
    // Start watching for changes
    if (this.hotReloader && !this.hotReloader.isWatching) {
      await this.hotReloader.start(this.sources);
    }
    
    this.emit('load', this.config);
  }
  
  // Get configuration value with full type safety
  get<Path extends string>(
    path: Path & Path<ZodInfer<TSchema>>
  ): PathValue<ZodInfer<TSchema>, Path> {
    if (!this.isLoaded || !this.config) {
      throw new ConfigNotLoadedError('Configuration not loaded. Call load() first.');
    }
    
    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(path);
      if (cached !== undefined) {
        return cached as PathValue<ZodInfer<TSchema>, Path>;
      }
    }
    
    const value = getByPath(this.config, path);
    
    // Update cache
    if (this.cache) {
      this.cache.set(path, value);
    }
    
    return value as PathValue<ZodInfer<TSchema>, Path>;
  }
  
  // Get with default value
  getOrDefault<Path extends string, DefaultValue>(
    path: Path & Path<ZodInfer<TSchema>>,
    defaultValue: DefaultValue
  ): PathValue<ZodInfer<TSchema>, Path> | DefaultValue {
    try {
      const value = this.get(path);
      return value !== undefined ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  // Check if path exists
  has<Path extends string>(
    path: Path & Path<ZodInfer<TSchema>>
  ): boolean {
    if (!this.config) return false;
    return getByPath(this.config, path) !== undefined;
  }
  
  // Get entire configuration
  getAll(): ZodInfer<TSchema> {
    if (!this.isLoaded || !this.config) {
      throw new ConfigNotLoadedError('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }
  
  // Set value (for in-memory updates, not persisted)
  set<Path extends string>(
    path: Path & Path<ZodInfer<TSchema>>,
    value: PathValue<ZodInfer<TSchema>, Path>
  ): void {
    if (!this.config) {
      throw new ConfigNotLoadedError('Configuration not loaded');
    }
    
    const oldValue = this.get(path);
    setByPath(this.config, path, value);
    
    // Invalidate cache for this path
    if (this.cache) {
      this.cache.invalidate(path);
    }
    
    this.emit('change', {
      type: 'value',
      path,
      previousValue: oldValue,
      currentValue: value,
      timestamp: new Date(),
    });
  }
  
  // Reload configuration
  async reload(): Promise<void> {
    const oldConfig = this.config;
    
    await this.doLoad();
    
    this.emit('reload', this.config);
    
    // Detect changes
    if (oldConfig) {
      const changes = this.diff(oldConfig, this.config);
      for (const change of changes) {
        this.emit('change', {
          type: change.type,
          path: change.path,
          previousValue: change.oldValue,
          currentValue: change.newValue,
          timestamp: new Date(),
        });
      }
    }
  }
  
  // Watch for changes (subscription-based)
  watch(callback: ConfigChangeListener<ZodInfer<TSchema>>): () => void {
    this.on('change', callback);
    return () => this.off('change', callback);
  }
  
  // Validate current configuration
  validate(): boolean {
    if (!this.config) return false;
    return this.schema.safeParse(this.config).success;
  }
  
  // Reset to defaults
  reset(): void {
    this.config = null;
    this.isLoaded = false;
    this.cache?.clear();
    this.hotReloader?.stop();
  }
  
  // Dispose resources
  dispose(): void {
    this.reset();
    this.removeAllListeners();
  }
  
  private defaultSources(): ConfigSource[] {
    return [
      new EnvironmentSource({ prefix: 'PH_' }),
      new FileSource({ path: 'config/default.yaml', required: false }),
    ];
  }
  
  private diff(old: Record<string, unknown>, current: Record<string, unknown>, basePath = ''): Array<{
    type: 'value' | 'structure';
    path: string;
    oldValue: unknown;
    newValue: unknown;
  }> {
    const changes: Array<{
      type: 'value' | 'structure';
      path: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];
    
    const allKeys = new Set([...Object.keys(old), ...Object.keys(current)]);
    
    for (const key of allKeys) {
      const path = basePath ? `${basePath}.${key}` : key;
      const oldVal = old[key];
      const newVal = current[key];
      
      if (typeof oldVal === 'object' && typeof newVal === 'object') {
        changes.push(...this.diff(
          oldVal as Record<string, unknown>,
          newVal as Record<string, unknown>,
          path
        ));
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          type: 'value',
          path,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
    
    return changes;
  }
}
```

### 6.2 Builder Pattern

```typescript
class ConfigBuilder<TSchema extends ZodType> {
  private schema: TSchema;
  private sources: ConfigSource[] = [];
  private cacheOptions: CacheOptions = { enabled: true };
  private hotReloadOptions: HotReloadOptions = { enabled: false };
  private secretResolverOptions?: SecretResolverOptions;
  
  constructor(schema: TSchema) {
    this.schema = schema;
  }
  
  // Add file source
  fromFile(path: string, options?: Omit<FileSourceOptions, 'path'>): this {
    this.sources.push(new FileSource({ path, ...options }));
    return this;
  }
  
  // Add environment source
  fromEnv(options?: EnvSourceOptions): this {
    this.sources.push(new EnvironmentSource(options));
    return this;
  }
  
  // Add Vault source
  fromVault(options: VaultSourceOptions): this {
    this.sources.push(new VaultSource(options));
    return this;
  }
  
  // Add AWS Secrets Manager source
  fromAWS(options: AWSSMSourceOptions): this {
    this.sources.push(new AWSSMSource(options));
    return this;
  }
  
  // Add custom source
  fromSource(source: ConfigSource): this {
    this.sources.push(source);
    return this;
  }
  
  // Configure caching
  withCache(options: CacheOptions): this {
    this.cacheOptions = { ...this.cacheOptions, ...options };
    return this;
  }
  
  // Configure hot reload
  withHotReload(options?: HotReloadOptions): this {
    this.hotReloadOptions = { enabled: true, ...options };
    return this;
  }
  
  // Configure secret resolution
  withSecretResolver(options: SecretResolverOptions): this {
    this.secretResolverOptions = options;
    return this;
  }
  
  // Build ConfigManager
  build(): ConfigManager<TSchema> {
    return new ConfigManager({
      schema: this.schema,
      sources: this.sources.length > 0 ? this.sources : undefined,
      cache: this.cacheOptions,
      hotReload: this.hotReloadOptions,
      secretResolver: this.secretResolverOptions,
    });
  }
  
  // Build and load
  async buildAndLoad(): Promise<ConfigManager<TSchema>> {
    const manager = this.build();
    await manager.load();
    return manager;
  }
}

// Usage
const configManager = await new ConfigBuilder(ConfigSchema)
  .fromFile('config/default.yaml')
  .fromFile(`config/${process.env.NODE_ENV}.yaml`, { watch: true })
  .fromVault({
    address: 'https://vault.example.com',
    auth: { method: 'token', credentials: { token: process.env.VAULT_TOKEN! } },
  })
  .fromEnv({ prefix: 'PH_' })
  .withHotReload({ debounceMs: 1000 })
  .withCache({ ttl: 60000 })
  .buildAndLoad();
```

---

## 7. Hot Reload Implementation

### 7.1 HotReloader Class

```typescript
import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';

interface HotReloaderOptions {
  debounceMs?: number;
  pollInterval?: number;
  onChange: () => void | Promise<void>;
}

class HotReloader extends EventEmitter {
  private options: Required<HotReloaderOptions>;
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastConfigHash: string | null = null;
  public isWatching = false;
  
  constructor(options: HotReloaderOptions) {
    super();
    this.options = {
      debounceMs: 500,
      pollInterval: 60000,
      ...options,
    };
  }
  
  async start(sources: ConfigSource[]): Promise<void> {
    if (this.isWatching) return;
    
    // Collect file paths from sources
    const fileSources = sources.filter(
      (s): s is FileSource => s instanceof FileSource
    );
    
    const paths = fileSources
      .filter(s => s['options']?.watch)
      .map(s => s['options'].path);
    
    if (paths.length === 0) return;
    
    // Set up file watching
    this.watcher = watch(paths, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });
    
    this.watcher.on('add', (path) => this.handleChange('add', path));
    this.watcher.on('change', (path) => this.handleChange('change', path));
    this.watcher.on('unlink', (path) => this.handleChange('unlink', path));
    this.watcher.on('error', (error) => this.emit('error', error));
    
    // Set up polling for sources that don't support events
    this.pollTimer = setInterval(() => {
      this.poll(sources);
    }, this.options.pollInterval);
    
    this.isWatching = true;
    this.emit('started');
  }
  
  stop(): void {
    this.watcher?.close();
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.isWatching = false;
    this.emit('stopped');
  }
  
  private handleChange(event: string, path: string): void {
    this.emit('fileChange', { event, path });
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(async () => {
      try {
        await this.options.onChange();
        this.emit('reloaded');
      } catch (error) {
        this.emit('error', error);
      }
    }, this.options.debounceMs);
  }
  
  private async poll(sources: ConfigSource[]): Promise<void> {
    // Check if any source has changed
    let hasChanges = false;
    
    for (const source of sources) {
      if ('poll' in source && typeof source.poll === 'function') {
        const changed = await source.poll();
        if (changed) {
          hasChanges = true;
          break;
        }
      }
    }
    
    if (hasChanges) {
      try {
        await this.options.onChange();
        this.emit('reloaded');
      } catch (error) {
        this.emit('error', error);
      }
    }
  }
}
```

### 7.2 Change Detection

```typescript
class ConfigChangeDetector {
  private hashes = new Map<string, string>();
  
  async hasChanged(source: ConfigSource): Promise<boolean> {
    const currentHash = await this.computeHash(source);
    const previousHash = this.hashes.get(source.constructor.name);
    
    if (previousHash !== currentHash) {
      this.hashes.set(source.constructor.name, currentHash);
      return true;
    }
    
    return false;
  }
  
  private async computeHash(source: ConfigSource): Promise<string> {
    const data = await source.load();
    return this.hashString(JSON.stringify(data));
  }
  
  private hashString(str: string): string {
    // Simple hash function - replace with crypto in production
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}
```

---

## 8. Secret Management

### 8.1 Secret Resolver

```typescript
interface SecretTemplate {
  pattern: RegExp;
  resolve: (match: RegExpMatchArray) => Promise<unknown>;
}

class SecretResolver {
  private sources: Map<string, SecretSource> = new Map();
  private templates: SecretTemplate[] = [];
  private cache: Map<string, { value: unknown; expiry: number }> = new Map();
  private cacheTtl: number;
  
  constructor(options: SecretResolverOptions) {
    this.cacheTtl = 5 * 60 * 1000;  // 5 minutes
    
    // Register sources
    if (options.sources) {
      for (const source of options.sources) {
        this.registerSource(source);
      }
    }
    
    // Register default templates
    this.registerDefaultTemplates();
    
    // Register custom templates
    if (options.templates) {
      for (const [name, resolver] of Object.entries(options.templates)) {
        this.registerTemplate(new RegExp(`\\$\\{${name}:([^}]+)\\}`, 'g'), resolver);
      }
    }
  }
  
  registerSource(source: SecretSource, name?: string): void {
    this.sources.set(name || source.constructor.name, source);
  }
  
  registerTemplate(pattern: RegExp, resolver: (match: string[]) => Promise<unknown>): void {
    this.templates.push({ pattern, resolve: resolver });
  }
  
  private registerDefaultTemplates(): void {
    // ${vault:path:key}
    this.registerTemplate(
      /\$\{vault:([^:]+):([^}]+)\}/g,
      async ([, path, key]) => {
        const source = this.sources.get('VaultSource');
        if (!source) throw new Error('Vault source not registered');
        return await source.getSecret(path, key);
      }
    );
    
    // ${aws:secret-id:key}
    this.registerTemplate(
      /\$\{aws:([^:]+):([^}]+)\}/g,
      async ([, secretId, key]) => {
        const source = this.sources.get('AWSSMSource');
        if (!source) throw new Error('AWS Secrets Manager source not registered');
        return await source.getSecret(secretId, key);
      }
    );
    
    // ${azure:vault-name:secret-name}
    this.registerTemplate(
      /\$\{azure:([^:]+):([^}]+)\}/g,
      async ([, vaultName, secretName]) => {
        const source = this.sources.get('AzureKVSource');
        if (!source) throw new Error('Azure Key Vault source not registered');
        return await source.getSecret(secretName);
      }
    );
    
    // ${gcp:project:secret:version}
    this.registerTemplate(
      /\$\{gcp:([^:]+):([^:]+):([^}]+)\}/g,
      async ([, project, secret, version]) => {
        const source = this.sources.get('GCPSMSource');
        if (!source) throw new Error('GCP Secret Manager source not registered');
        return await source.getSecret(secret, version);
      }
    );
    
    // ${env:VAR_NAME}
    this.registerTemplate(
      /\$\{env:([^}]+)\}/g,
      async ([, varName]) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new Error(`Environment variable ${varName} not found`);
        }
        return value;
      }
    );
  }
  
  async resolve(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    return await this.resolveValue(config) as Record<string, unknown>;
  }
  
  private async resolveValue(value: unknown): Promise<unknown> {
    if (typeof value === 'string') {
      return await this.resolveString(value);
    }
    
    if (Array.isArray(value)) {
      return await Promise.all(value.map(v => this.resolveValue(v)));
    }
    
    if (typeof value === 'object' && value !== null) {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = await this.resolveValue(val);
      }
      return resolved;
    }
    
    return value;
  }
  
  private async resolveString(str: string): Promise<unknown> {
    let result = str;
    
    for (const template of this.templates) {
      const matches = Array.from(str.matchAll(template.pattern));
      
      for (const match of matches) {
        const cacheKey = match[0];
        const cached = this.cache.get(cacheKey);
        
        let replacement: unknown;
        if (cached && cached.expiry > Date.now()) {
          replacement = cached.value;
        } else {
          replacement = await template.resolve(match);
          this.cache.set(cacheKey, {
            value: replacement,
            expiry: Date.now() + this.cacheTtl,
          });
        }
        
        result = result.replace(match[0], String(replacement));
      }
    }
    
    return result;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

---

## 9. Validation System

### 9.1 Validation Error Handling

```typescript
class ConfigValidationError extends Error {
  constructor(
    message: string,
    public details: {
      issues: Array<{
        path: (string | number)[];
        message: string;
        code: string;
      }>;
    }
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
  
  toString(): string {
    const lines = [this.message, ''];
    
    for (const issue of this.details.issues) {
      const path = issue.path.join('.');
      lines.push(`  ${path}: ${issue.message} (${issue.code})`);
    }
    
    return lines.join('\n');
  }
  
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      issues: this.details.issues,
    };
  }
}

// Error formatter
class ConfigErrorFormatter {
  format(error: ConfigValidationError, options: { colors?: boolean } = {}): string {
    const { colors = false } = options;
    
    const color = {
      red: colors ? '\x1b[31m' : '',
      yellow: colors ? '\x1b[33m' : '',
      reset: colors ? '\x1b[0m' : '',
    };
    
    const lines = [
      `${color.red}Configuration Validation Failed${color.reset}`,
      '',
    ];
    
    for (const issue of error.details.issues) {
      const path = issue.path.join('.');
      lines.push(`${color.yellow}• ${path}${color.reset}`);
      lines.push(`  ${issue.message}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
}
```

---

## 10. Type System

### 10.1 Path-Based Type Safety

```typescript
// Type helpers for path-based access
type Path<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${Path<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]>
      ? PathValue<T[K], Rest>
      : T[K] extends object
        ? PathValue<T[K], Rest>
        : never
    : never
  : P extends keyof T
    ? T[P]
    : never;

// Helper function to get value by path
function getByPath<T>(obj: T, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

// Helper function to set value by path
function setByPath<T>(obj: T, path: string, value: unknown): void {
  const keys = path.split('.');
  const last = keys.pop()!;
  
  let current: Record<string, unknown> = obj as Record<string, unknown>;
  for (const key of keys) {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[last] = value;
}

// Deep merge utility
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (key in result) {
      const targetVal = result[key];
      const sourceVal = source[key];
      
      if (
        typeof targetVal === 'object' &&
        targetVal !== null &&
        !Array.isArray(targetVal) &&
        typeof sourceVal === 'object' &&
        sourceVal !== null &&
        !Array.isArray(sourceVal)
      ) {
        result[key] = deepMerge(
          targetVal as Record<string, unknown>,
          sourceVal as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceVal as T[Extract<keyof T, string>];
      }
    } else {
      result[key] = source[key] as T[Extract<keyof T, string>];
    }
  }
  
  return result;
}
```

---

## 11. Feature Flags Integration

### 11.1 Feature Flag Client

```typescript
interface FeatureFlagClient {
  isEnabled(flagName: string, context?: Record<string, unknown>): boolean | Promise<boolean>;
  getVariant(flagName: string, context?: Record<string, unknown>): string | Promise<string>;
  track(event: string, context?: Record<string, unknown>, value?: number): void | Promise<void>;
}

class ConfigFeatureFlagIntegration {
  constructor(
    private configManager: ConfigManager<ZodType>,
    private featureFlagClient: FeatureFlagClient
  ) {}
  
  async isEnabled(flagName: string): Promise<boolean> {
    const context = await this.buildContext();
    return await this.featureFlagClient.isEnabled(flagName, context);
  }
  
  async getVariant(flagName: string): Promise<string> {
    const context = await this.buildContext();
    return await this.featureFlagClient.getVariant(flagName, context);
  }
  
  private async buildContext(): Promise<Record<string, unknown>> {
    return {
      environment: this.configManager.get('app.environment'),
      version: this.configManager.get('app.version'),
    };
  }
}
```

---

## 12. Performance Requirements

### 12.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Load Time | < 100ms | Time to load and validate config |
| Get Operation | < 1μs | Cached configuration access |
| Memory Usage | < 10MB | Base memory footprint |
| Cache Hit Rate | > 95% | Percentage of cached reads |
| Reload Time | < 50ms | Time to detect and apply changes |

### 12.2 Benchmarks

```typescript
// Performance benchmarks
import { Bench } from 'tinybench';

const bench = new Bench();

bench
  .add('ConfigManager.load()', async () => {
    const manager = new ConfigBuilder(ConfigSchema)
      .fromFile('config/default.yaml')
      .build();
    await manager.load();
  })
  .add('ConfigManager.get()', async () => {
    // Assumes pre-loaded manager
    manager.get('server.port');
  })
  .add('ConfigManager.get (cached)', async () => {
    // Second access (cached)
    manager.get('server.port');
  });

await bench.run();
console.table(bench.table());
```

---

## 13. Security Considerations

### 13.1 Security Requirements

1. **Secrets Never in Code**: All secrets must come from secure sources
2. **Encryption at Rest**: Secret files must be encrypted
3. **Encryption in Transit**: TLS for all remote communication
4. **Access Control**: Fine-grained permissions for configuration
5. **Audit Logging**: All configuration changes must be logged
6. **Least Privilege**: Minimum required permissions for each component

### 13.2 Secret Handling

```typescript
// Secure secret handling
class SecureSecretManager {
  private encryptionKey: Buffer;
  
  constructor(key: string) {
    this.encryptionKey = Buffer.from(key, 'base64');
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## 14. Testing Strategy

### 14.1 Test Coverage Requirements

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| ConfigManager | ✅ Required | ✅ Required | ⚠️ Optional |
| Sources | ✅ Required | ✅ Required | ❌ None |
| Validator | ✅ Required | ⚠️ Optional | ❌ None |
| Secret Resolver | ✅ Required | ✅ Required | ❌ None |
| Hot Reloader | ✅ Required | ✅ Required | ⚠️ Optional |

### 14.2 Test Utilities

```typescript
// Test utilities for configuration testing
class ConfigTestUtils {
  static createMockSource(data: Record<string, unknown>): ConfigSource {
    return {
      priority: 1,
      async load() {
        return data;
      },
    };
  }
  
  static createTempConfigFile(content: string, format: 'yaml' | 'json' = 'yaml'): string {
    const tmpDir = os.tmpdir();
    const fileName = `test-config-${Date.now()}.${format}`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
  }
  
  static cleanupTempFile(filePath: string): void {
    fs.unlinkSync(filePath);
  }
  
  static setEnvVars(vars: Record<string, string>): () => void {
    const original = { ...process.env };
    
    for (const [key, value] of Object.entries(vars)) {
      process.env[key] = value;
    }
    
    return () => {
      process.env = original;
    };
  }
}
```

---

## 15. Error Handling

### 15.1 Error Types

```typescript
// Base configuration error
class ConfigError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

// Specific error types
class ConfigNotLoadedError extends ConfigError {
  constructor(message: string) {
    super(message, 'CONFIG_NOT_LOADED');
    this.name = 'ConfigNotLoadedError';
  }
}

class ConfigLoadError extends ConfigError {
  constructor(
    message: string,
    public source?: ConfigSource,
    public cause?: Error
  ) {
    super(message, 'CONFIG_LOAD_ERROR', { source, cause });
    this.name = 'ConfigLoadError';
  }
}

class ConfigValidationError extends ConfigError {
  constructor(
    message: string,
    public issues: Array<{
      path: (string | number)[];
      message: string;
      code: string;
    }>
  ) {
    super(message, 'CONFIG_VALIDATION_ERROR', { issues });
    this.name = 'ConfigValidationError';
  }
}

class ConfigPathError extends ConfigError {
  constructor(
    public path: string,
    message = `Path not found: ${path}`
  ) {
    super(message, 'CONFIG_PATH_ERROR', { path });
    this.name = 'ConfigPathError';
  }
}

class SecretResolutionError extends ConfigError {
  constructor(
    message: string,
    public template?: string,
    public cause?: Error
  ) {
    super(message, 'SECRET_RESOLUTION_ERROR', { template, cause });
    this.name = 'SecretResolutionError';
  }
}
```

---

## 16. Configuration Examples

### 16.1 Basic Configuration

```typescript
// config/default.yaml
app:
  name: my-application
  version: 1.0.0
  environment: development

server:
  host: 0.0.0.0
  port: 8080
  timeout: 30000

database:
  url: postgres://localhost:5432/dev
  poolSize: 10
  ssl: false

logging:
  level: debug
  format: pretty
```

### 16.2 Production Configuration

```typescript
// config/production.yaml
app:
  environment: production

server:
  port: 443
  ssl:
    enabled: true
    cert: /etc/ssl/cert.pem
    key: /etc/ssl/key.pem

database:
  url: ${vault:secret/data/db:url}
  ssl: true
  poolSize: 50

logging:
  level: warn
  format: json
  file:
    path: /var/log/app.log
    maxSize: 100MB
    maxFiles: 10
```

### 16.3 Environment Variables

```bash
# .env file
PH_APP__NAME=my-application
PH_SERVER__PORT=8080
PH_DATABASE__URL=postgres://localhost:5432/dev
PH_LOGGING__LEVEL=debug
PH_FEATURES__NEW_API=true
```

---

## 17. API Reference

### 17.1 ConfigManager API

```typescript
class ConfigManager<TSchema extends ZodType> {
  // Constructor
  constructor(options: ConfigManagerOptions<TSchema>);
  
  // Loading
  load(): Promise<void>;
  reload(): Promise<void>;
  
  // Access
  get<Path extends string>(path: Path): PathValue<ZodInfer<TSchema>, Path>;
  getOrDefault<Path extends string, D>(path: Path, defaultValue: D): PathValue<ZodInfer<TSchema>, Path> | D;
  has<Path extends string>(path: Path): boolean;
  getAll(): ZodInfer<TSchema>;
  
  // Mutation (in-memory only)
  set<Path extends string>(path: Path, value: PathValue<ZodInfer<TSchema>, Path>): void;
  
  // Watching
  watch(callback: ConfigChangeListener<ZodInfer<TSchema>>): () => void;
  
  // Validation
  validate(): boolean;
  
  // Lifecycle
  reset(): void;
  dispose(): void;
  
  // Events
  on(event: 'change' | 'error' | 'load' | 'reload', listener: Function): this;
  once(event: 'change' | 'error' | 'load' | 'reload', listener: Function): this;
}
```

### 17.2 ConfigBuilder API

```typescript
class ConfigBuilder<TSchema extends ZodType> {
  constructor(schema: TSchema);
  
  // Sources
  fromFile(path: string, options?: FileSourceOptions): this;
  fromEnv(options?: EnvSourceOptions): this;
  fromVault(options: VaultSourceOptions): this;
  fromAWS(options: AWSSMSourceOptions): this;
  fromAzure(options: AzureKVSourceOptions): this;
  fromGCP(options: GCPSMSourceOptions): this;
  fromSource(source: ConfigSource): this;
  
  // Configuration
  withCache(options: CacheOptions): this;
  withHotReload(options?: HotReloadOptions): this;
  withSecretResolver(options: SecretResolverOptions): this;
  
  // Building
  build(): ConfigManager<TSchema>;
  buildAndLoad(): Promise<ConfigManager<TSchema>>;
}
```

---

## 18. References

### 18.1 Internal References

1. [Configuration SOTA](./research/CONFIGURATION_SOTA.md)
2. [Feature Flags SOTA](./research/FEATURE_FLAGS_SOTA.md)
3. [ADR-001: Validation Library](./adr/ADR-001-validation-library.md)
4. [ADR-002: Config Source](./adr/ADR-002-config-source.md)

### 18.2 External References

1. [Zod Documentation](https://zod.dev)
2. [YAML Specification](https://yaml.org/spec/)
3. [TOML Specification](https://toml.io/en/v1.0.0)
4. [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
5. [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
6. [Azure Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/)
7. [GCP Secret Manager](https://cloud.google.com/secret-manager/)
8. [Twelve-Factor App Config](https://12factor.net/config)

---

## Document Metadata

- **Version**: 2.0.0
- **Last Updated**: 2026-04-02
- **Status**: Draft
- **Author**: Phenotype Architecture Team
- **Reviewers**: Technical Lead, DevOps Team
- **Next Review**: 2026-05-02

---

*This document is a living specification. Updates should be proposed via PR and approved by the architecture team.*
