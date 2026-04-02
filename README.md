# Phenotype Config (TypeScript)

> Configuration Management for Phenotype Platform

TypeScript-based configuration management with support for multiple sources, validation, hot-reloading, and environment-specific overrides.

## Features

- **Multi-Source**: Files, environment variables, secrets managers
- **Validation**: JSON Schema validation with detailed errors
- **Hot-Reloading**: Watch for config changes without restart
- **Environment-Specific**: Dev, staging, production profiles
- **Secrets Integration**: HashiCorp Vault, AWS Secrets Manager
- **Type Safety**: Full TypeScript type inference from schemas

## Architecture

```
Config Architecture:
- Sources: Files, ENV, Vault, AWS SM
- Validation: JSON Schema, Zod
- Hot-Reload: File watchers, polling
- Caching: In-memory, Redis
- Merging: Priority-based merging
```

## Configuration Sources

| Source | Priority | Hot-Reload | Example |
|--------|----------|------------|---------|
| CLI flags | 1 | No | `--port 8080` |
| Environment | 2 | No | `PORT=8080` |
| Secrets manager | 3 | Yes | Vault, AWS SM |
| Config files | 4 | Yes | `config.yaml` |
| Defaults | 5 | No | Built-in |

## Quick Start

```typescript
import { ConfigManager, z } from 'phenotype-config-ts';

// Define schema with Zod
const configSchema = z.object({
  server: z.object({
    port: z.number().default(8080),
    host: z.string().default('0.0.0.0'),
  }),
  database: z.object({
    url: z.string(),
    maxConnections: z.number().default(10),
  }),
  features: z.object({
    enableCache: z.boolean().default(false),
    cacheTtl: z.number().default(300),
  }),
});

// Initialize config manager
const config = new ConfigManager({
  schema: configSchema,
  sources: [
    { type: 'file', path: './config.yaml' },
    { type: 'env', prefix: 'PH_' },
    { type: 'vault', path: 'secret/phenotype' },
  ],
});

// Load configuration
await config.load();

// Access typed config
const port = config.get('server.port');
const dbUrl = config.get('database.url');

// Watch for changes
config.on('change', (key, newValue, oldValue) => {
  console.log(`Config ${key} changed: ${oldValue} -> ${newValue}`);
});
```

## Configuration

```yaml
# config/default.yaml
server:
  port: 8080
  host: 0.0.0.0
  timeout: 30s

database:
  url: postgres://localhost:5432/phenotype
  maxConnections: 10
  ssl: false

features:
  enableCache: true
  cacheTtl: 300

logging:
  level: info
  format: json

# config/production.yaml (environment-specific)
server:
  port: 443
  ssl:
    cert: /etc/phenotype/cert.pem
    key: /etc/phenotype/key.pem

database:
  url: ${DATABASE_URL}
  ssl: true

logging:
  level: warn
```

## Secrets Integration

```typescript
// HashiCorp Vault
const vaultSource = {
  type: 'vault',
  address: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN,
  path: 'secret/phenotype',
  keyTransform: (key: string) => key.toLowerCase(),
};

// AWS Secrets Manager
const awsSource = {
  type: 'aws-sm',
  region: 'us-east-1',
  secretId: 'phenotype/config',
};
```

## References

- Zod: https://zod.dev/
- JSON Schema: https://json-schema.org/
- Vault: https://www.vaultproject.io/
- AWS Secrets Manager: https://aws.amazon.com/secrets-manager/