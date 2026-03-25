# phenotype-config-ts

TypeScript configuration management with Zod validation. Schema-first config with type safety and runtime validation.

## Features

- Zod schema validation
- Environment variable binding
- Type-safe config objects
- Nested config support
- Config versioning
- Migration helpers

## Installation

```bash
npm install @phenotype/config-ts zod
```

## Usage

### Define Schema

```typescript
import { createConfig, z } from '@phenotype/config-ts';

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost'),
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().optional(),
  }),
  auth: z.object({
    jwtSecret: z.string().min(32),
    expiresIn: z.string().default('1h'),
  }),
});

export const config = createConfig(configSchema, {
  envPrefix: 'APP_',
  schemaVersion: 1,
});
```

### Access Config

```typescript
import { config } from './config';

const port = config.server.port;
const dbUrl = config.database.url;
```

### Environment Variables

```bash
APP_SERVER_PORT=8080
APP_DATABASE_URL=postgresql://localhost/mydb
APP_AUTH_JWT_SECRET=super-secret-key-min-32-chars!!
```

## Architecture

```
src/
├── domain/           # Config concepts
│   ├── ConfigSchema.ts
│   └── ConfigValue.ts
├── application/       # Config loading
│   ├── ConfigLoader.ts
│   └── ConfigMigrator.ts
├── ports/           # Interfaces
│   └── ConfigSource.ts
└── adapters/        # Implementations
    ├── EnvSource.ts
    ├── FileSource.ts
    └── VaultSource.ts
```

## License

MIT
