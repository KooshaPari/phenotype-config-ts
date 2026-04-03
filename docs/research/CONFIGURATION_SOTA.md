# Configuration Management - State of the Art (SOTA)

> Comprehensive research on configuration management systems, formats, validation libraries, and best practices for TypeScript/JavaScript applications.

**Research Date**: 2026-04-02  
**Document Version**: 1.0  
**Author**: Phenotype Research Team  
**Status**: Active Research

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Configuration Formats Deep Dive](#2-configuration-formats-deep-dive)
3. [Schema Validation Libraries](#3-schema-validation-libraries)
4. [Configuration Hierarchy Patterns](#4-configuration-hierarchy-patterns)
5. [Environment Variable Handling](#5-environment-variable-handling)
6. [TypeScript Type Generation](#6-typescript-type-generation-from-schemas)
7. [Hot Reloading Implementations](#7-hot-reloading-implementations)
8. [Configuration Servers](#8-configuration-servers)
9. [Secret Management](#9-secret-management-in-configuration)
10. [References](#10-references)

---

## 1. Executive Summary

Modern application configuration management has evolved from simple JSON files to sophisticated, multi-source systems that support:

- **Multiple configuration formats** (YAML, TOML, JSON, JavaScript)
- **Runtime schema validation** with detailed error messages
- **Configuration hierarchies** (CLI → Environment → Files → Defaults)
- **Type-safe access** through TypeScript type inference
- **Hot reloading** for dynamic configuration changes
- **Secret management** integration with external vaults
- **Feature flag systems** for dynamic feature toggling

### Key Findings

| Aspect | Recommendation | Rationale |
|--------|---------------|-----------|
| **Format** | YAML for humans, JSON for machines | YAML supports comments, JSON is universal |
| **Validation** | Zod for TypeScript | Best type inference, smallest bundle |
| **Hierarchy** | CLI > ENV > Secrets > Files > Defaults | Industry standard priority |
| **Reloading** | File watching + signal-based | Cross-platform compatibility |
| **Secrets** | External vaults with caching | Security and performance balance |

---

## 2. Configuration Formats Deep Dive

### 2.1 YAML (YAML Ain't Markup Language)

#### Overview
YAML is the most popular configuration format for human-written configuration files due to its readability and feature set.

#### Specification
- **Spec Version**: YAML 1.2 (2009), YAML 1.1 widely used
- **MIME Type**: `application/yaml`, `text/yaml`
- **File Extensions**: `.yaml`, `.yml`

#### Features

```yaml
# Comments are supported
server:
  host: "0.0.0.0"  # Inline comments
  port: 8080
  ssl:
    enabled: true
    cert: |
      -----BEGIN CERTIFICATE-----
      MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3Qa... # Multi-line strings
      -----END CERTIFICATE-----

# Anchors and aliases for DRY
defaults: &defaults
  adapter: postgres
  host: localhost
  port: 5432

development:
  database:
    <<: *defaults  # Merge keys
    name: myapp_dev
    
production:
  database:
    <<: *defaults
    name: myapp_prod
    host: prod-db.example.com

# Complex data types
features:
  - name: dark_mode
    enabled: true
    rollout_percentage: 100
  - name: beta_api
    enabled: false
    rollout_percentage: 5

# Type tags
version: !!str 1.0  # Force string type
port: !!int "8080"  # Force integer from string
```

#### Advantages
1. **Human-readable**: Clean, indentation-based structure
2. **Comments**: Full support for inline and block comments
3. **Type system**: Implicit typing with optional explicit tags
4. **References**: Anchors (`&`) and aliases (`*`) reduce duplication
5. **Multi-document**: Single file can contain multiple documents (`---`)
6. **Binary data**: Support for base64-encoded binary

#### Disadvantages
1. **Whitespace-sensitive**: Indentation errors are common
2. **Ambiguous typing**: `yes`/`no` can be parsed as booleans
3. **Performance**: Parsing is slower than JSON
4. **Complexity**: Full spec is large (YAML 1.2 has 66 pages)
5. **Security**: Known vulnerabilities with untrusted input (safe_load recommended)

#### TypeScript Implementation

```typescript
import YAML from 'yaml';
import { readFileSync } from 'fs';

// Reading YAML
const config = YAML.parse(readFileSync('config.yaml', 'utf8'));

// Writing YAML with options
const yamlString = YAML.stringify(config, {
  indent: 2,
  lineWidth: 80,
  noRefs: true,  // Don't use anchors/aliases
  sortMapEntries: true,
});

// Streaming for large files
import { createReadStream } from 'fs';
const stream = createReadStream('large-config.yaml');
YAML.parseAllDocuments(stream, (doc) => {
  console.log(doc.toJS());
});
```

#### Popular Libraries

| Library | Stars | Bundle Size | Features |
|---------|-------|-------------|----------|
| `yaml` (eemeli) | 3.5k | 45KB | Full YAML 1.2, streaming, browser |
| `js-yaml` | 9k | 35KB | YAML 1.2, CLI, browser |
| `yamljs` | 800 | 25KB | YAML 1.0, simple API |

### 2.2 TOML (Tom's Obvious, Minimal Language)

#### Overview
TOML was designed specifically for configuration files with a focus on being obvious and minimal.

#### Specification
- **Spec Version**: TOML 1.0.0 (2021)
- **MIME Type**: `application/toml`
- **File Extensions**: `.toml`

#### Features

```toml
# Comments start with hash
title = "My Application"

# Basic key-value pairs
name = "phenotype"
version = "1.0.0"
description = """Multi-line strings
are supported for longer descriptions."""

# Types are unambiguous
port = 8080           # Integer
ratio = 0.95          # Float
enabled = true        # Boolean
date = 2024-01-15     # Date
 datetime = 2024-01-15T10:30:00Z  # DateTime

# Arrays
ports = [8080, 8081, 8082]
names = ["dev", "staging", "prod"]

# Nested tables (sections)
[server]
host = "0.0.0.0"
port = 8080

[server.ssl]
enabled = true
cert_path = "/etc/ssl/cert.pem"

# Array of tables
[[database.replicas]]
host = "db1.example.com"
priority = 1

[[database.replicas]]
host = "db2.example.com"
priority = 2

# Inline tables (compact)
point = { x = 1, y = 2 }

# Dotted keys for nested access
fruit.name = "banana"
fruit.color = "yellow"
# Equivalent to:
# [fruit]
# name = "banana"
# color = "yellow"
```

#### Advantages
1. **Unambiguous**: No confusion between strings and numbers
2. **Standard types**: Native date, time, and datetime support
3. **No whitespace issues**: Not indentation-based
4. **Simple spec**: Much smaller than YAML specification
5. **Popular in Rust**: Cargo, Rustfmt use TOML
6. **Cargo-compatible**: Native support in Rust ecosystem

#### Disadvantages
1. **Verbosity**: More verbose than YAML for nested structures
2. **Array syntax**: Array of tables can be confusing
3. **Less popular**: Smaller ecosystem than YAML/JSON
4. **No references**: No built-in DRY mechanisms like YAML anchors

#### TypeScript Implementation

```typescript
import { parse, stringify } from '@iarna/toml';
import { readFileSync } from 'fs';

// Parsing TOML
const config = parse(readFileSync('config.toml', 'utf8'));

// Converting to TOML
const tomlString = stringify({
  title: "My App",
  owner: {
    name: "John Doe"
  },
  database: {
    server: "192.168.1.1",
    ports: [8001, 8001, 8002],
    connection_max: 5000
  }
});

// Type-safe parsing with Zod
import { z } from 'zod';

const ConfigSchema = z.object({
  title: z.string(),
  server: z.object({
    host: z.string().default('0.0.0.0'),
    port: z.number().default(8080),
  }),
  database: z.object({
    ports: z.array(z.number()),
  }),
});

const config = ConfigSchema.parse(parse(readFileSync('config.toml', 'utf8')));
```

#### Popular Libraries

| Library | Stars | Bundle Size | Features |
|---------|-------|-------------|----------|
| `@iarna/toml` | 1.5k | 25KB | TOML 1.0, streaming, round-trip |
| `toml` | 2k | 20KB | Basic TOML 1.0 support |
| `smol-toml` | 300 | 8KB | Minimal implementation |

### 2.3 JSON (JavaScript Object Notation)

#### Overview
JSON is the universal data interchange format, ubiquitous across all programming languages.

#### Specification
- **Spec Version**: RFC 8259 (2017), ECMA-404
- **MIME Type**: `application/json`
- **File Extensions**: `.json`

#### Features

```json
{
  "name": "phenotype-config",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "zod": "^3.22.0",
    "yaml": "^2.3.0"
  },
  "config": {
    "server": {
      "port": 8080,
      "host": "0.0.0.0"
    }
  }
}
```

#### Advantages
1. **Universal support**: Every language has JSON support
2. **Fast parsing**: Native parsing in most environments
3. **Schema validation**: JSON Schema ecosystem
4. **Network-native**: HTTP APIs use JSON by default
5. **Type inference**: Easy to generate types from JSON
6. **Streaming**: JSONL (JSON Lines) for large datasets

#### Disadvantages
1. **No comments**: Official JSON doesn't support comments
2. **Verbose**: More characters than YAML/TOML for same data
3. **No trailing commas**: Syntax error for trailing commas
4. **String-only keys**: Object keys must be strings
5. **Limited types**: No date, datetime, or binary types

#### JSON5 Extension

```javascript
// JSON5 supports comments and relaxed syntax
{
  // Comments are allowed
  name: 'my-app',  // Trailing commas okay
  version: '1.0.0',
  config: {
    port: 8080,
    enabled: true,
    // Multi-line strings
    description: `
      This is a
      multi-line string
    `,
  },
}
```

#### TypeScript Implementation

```typescript
import { readFileSync } from 'fs';
import { promisify } from 'util';

// Native JSON parsing (fastest)
const config = JSON.parse(readFileSync('config.json', 'utf8'));

// JSON5 for commented configs
import JSON5 from 'json5';
const config5 = JSON5.parse(readFileSync('config.json5', 'utf8'));

// JSON Schema validation
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });

const schema = {
  type: "object",
  properties: {
    port: { type: "integer", minimum: 1, maximum: 65535 },
    host: { type: "string", format: "hostname" },
  },
  required: ["port"],
};

const validate = ajv.compile(schema);
const valid = validate(config);
if (!valid) {
  console.error(validate.errors);
}
```

### 2.4 Format Comparison Matrix

| Feature | YAML | TOML | JSON | JSON5 |
|---------|------|------|------|-------|
| Comments | ✅ | ✅ | ❌ | ✅ |
| Trailing Commas | ❌ | N/A | ❌ | ✅ |
| Multi-line Strings | ✅ | ✅ | ❌ | ✅ |
| Binary Data | ✅ | ❌ | ❌ | ❌ |
| Date/DateTime | ⚠️ Tags | ✅ Native | ❌ | ❌ |
| References/Anchors | ✅ | ❌ | ❌ | ❌ |
| Schema Validation | JSON Schema | JSON Schema | JSON Schema | JSON Schema |
| TypeScript Types | Zod/infer | Zod/infer | QuickType | Zod/infer |
| Parsing Speed | Medium | Fast | Fastest | Fast |
| Bundle Size | 35KB | 25KB | 0KB (native) | 15KB |
| Human Readable | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| Machine Readable | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### 2.5 Format Selection Decision Tree

```
Configuration Format Selection:

Is config written by humans?
├── YES → Need comments?
│   ├── YES → Need advanced features (refs, merges)?
│   │   ├── YES → YAML
│   │   └── NO → TOML or YAML
│   └── NO → TOML (simpler, clearer types)
└── NO → API/Network communication?
    ├── YES → JSON (universal, fast)
    └── NO → Need comments?
        ├── YES → JSON5
        └── NO → JSON (simplest)
```

### 2.6 Other Notable Formats

#### HOCON (Human-Optimized Config Object Notation)

```hocon
# HOCON combines JSON + properties + environment variables
app {
  name = "My App"
  name = ${?APP_NAME}  # Override from env
  
  database {
    url = "jdbc:postgresql://localhost/mydb"
    url = ${?DATABASE_URL}  # Override from env
  }
}

# Include other configs
include "application-local.conf"
```

#### INI/Properties Files

```ini
; Classic INI format
[database]
host=localhost
port=5432
name=myapp

[cache]
enabled=true
ttl=3600
```

#### XML (Legacy Enterprise)

```xml
<?xml version="1.0"?>
<configuration>
  <server>
    <host>0.0.0.0</host>
    <port>8080</port>
  </server>
</configuration>
```

---

## 3. Schema Validation Libraries

### 3.1 Zod (Recommended)

#### Overview
Zod is a TypeScript-first schema validation with static type inference.

#### Installation
```bash
npm install zod
```

#### Core Features

```typescript
import { z } from 'zod';

// Basic primitives
const StringSchema = z.string();
const NumberSchema = z.number();
const BooleanSchema = z.boolean();
const DateSchema = z.date();

// Objects with defaults and transforms
const ServerSchema = z.object({
  host: z.string().default('0.0.0.0'),
  port: z.number().int().min(1).max(65535).default(8080),
  ssl: z.object({
    enabled: z.boolean().default(false),
    cert: z.string().optional(),
    key: z.string().optional(),
  }).default({ enabled: false }),
});

// Type inference
type ServerConfig = z.infer<typeof ServerSchema>;
// { host: string; port: number; ssl: { enabled: boolean; cert?: string; key?: string } }

// Validation
const result = ServerSchema.safeParse({
  host: 'localhost',
  port: 3000,
});

if (result.success) {
  console.log(result.data);  // Typed data
} else {
  console.error(result.error.issues);
  // Detailed error messages
}

// Parsing with transforms
const PortSchema = z.string().transform((val) => parseInt(val, 10));
const port = PortSchema.parse("8080");  // 8080 (number)

// Unions and discriminated unions
const ConfigSchema = z.union([
  z.object({ type: z.literal('file'), path: z.string() }),
  z.object({ type: z.literal('env'), prefix: z.string() }),
]);

// Discriminated union for better errors
const SourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('file'), path: z.string() }),
  z.object({ type: z.literal('env'), prefix: z.string() }),
  z.object({ type: z.literal('vault'), path: z.string(), mount: z.string() }),
]);

// Arrays with constraints
const PortsSchema = z.array(z.number()).min(1).max(10);

// Records (dynamic keys)
const HeadersSchema = z.record(z.string());

// Refinements for custom validation
const EmailSchema = z.string().refine(
  (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  { message: 'Invalid email format' }
);

// Preprocess for complex parsing
const StringOrNumberSchema = z.preprocess(
  (val) => (typeof val === 'string' ? parseFloat(val) : val),
  z.number()
);

// Brand types for nominal typing
const UserId = z.string().brand<'UserId'>();
type UserId = z.infer<typeof UserId>;

// Lazy/recursive schemas
const CategorySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(CategorySchema),
  })
);
```

#### Advanced Patterns

```typescript
// Conditional validation
const ConfigWithValidation = z.object({
  ssl: z.object({
    enabled: z.boolean(),
  }),
}).refine((data) => {
  if (data.ssl.enabled) {
    // Additional validation when SSL is enabled
    return data.ssl.cert && data.ssl.key;
  }
  return true;
}, {
  message: "SSL requires cert and key when enabled",
  path: ["ssl"],
});

// Custom error messages
const Schema = z.object({
  port: z.number({
    required_error: "Port is required",
    invalid_type_error: "Port must be a number",
  }).min(1, "Port must be at least 1"),
});

// Async validation
const AsyncSchema = z.string().refine(async (val) => {
  const exists = await checkDatabase(val);
  return exists;
}, {
  message: "Value not found in database",
});

// Chaining transforms
const NormalizedSchema = z.string()
  .trim()
  .toLowerCase()
  .transform(val => val.replace(/\s+/g, '-'));
```

#### Error Handling

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
  }),
});

try {
  const config = ConfigSchema.parse(input);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Structured error information
    for (const issue of error.issues) {
      console.log(`Path: ${issue.path.join('.')}`);
      console.log(`Message: ${issue.message}`);
      console.log(`Code: ${issue.code}`);
    }
    
    // Flatten errors
    const flattened = error.flatten();
    console.log(flattened.fieldErrors);
    console.log(flattened.formErrors);
  }
}

// Format errors for display
function formatZodError(error: z.ZodError): string {
  return error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
}
```

### 3.2 Joi (Hapi.js Validation)

#### Overview
Joi is a powerful schema description language and data validator for JavaScript.

#### Installation
```bash
npm install joi
```

#### Core Features

```typescript
import Joi from 'joi';

// Basic schema
const schema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().pattern(/^[a-zA-Z0-9]{3,30}$/),
  email: Joi.string().email({ minDomainSegments: 2 }),
  birth_year: Joi.number().integer().min(1900).max(2024),
});

// Validation options
const options = {
  abortEarly: false,        // Return all errors
  allowUnknown: true,       // Allow unknown keys
  stripUnknown: true,       // Remove unknown keys
  convert: true,            // Convert types
  presence: 'required',       // Default presence
};

const result = schema.validate({ username: 'john', birth_year: 1994 }, options);

if (result.error) {
  console.log(result.error.details);
} else {
  console.log(result.value);  // Validated and possibly converted value
}

// Complex schemas
const ServerSchema = Joi.object({
  host: Joi.string().hostname().default('0.0.0.0'),
  port: Joi.number().integer().min(1).max(65535).default(8080),
  ssl: Joi.object({
    enabled: Joi.boolean().default(false),
    cert: Joi.string().when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }).default({ enabled: false }),
});

// Conditional validation
const DynamicSchema = Joi.object({
  type: Joi.string().valid('file', 'env', 'vault').required(),
  path: Joi.string().when('type', {
    is: Joi.valid('file', 'vault'),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

// Alternatives (unions)
const ConfigSource = Joi.alternatives().try(
  Joi.object({ type: Joi.string().valid('file').required(), path: Joi.string().required() }),
  Joi.object({ type: Joi.string().valid('env').required(), prefix: Joi.string().required() }),
);

// Arrays with validation
const PortsSchema = Joi.array().items(
  Joi.number().integer().min(1).max(65535)
).min(1).max(10).unique();

// Custom validation
const CustomSchema = Joi.string().custom((value, helpers) => {
  if (!value.startsWith('custom:')) {
    return helpers.error('string.custom_prefix');
  }
  return value;
});

// Extension for custom types
const customJoi = Joi.extend({
  type: 'semver',
  messages: {
    'semver.base': '{{#label}} must be a valid semver version',
  },
  validate(value, helpers) {
    if (!/^\d+\.\d+\.\d+/.test(value)) {
      return { value, errors: helpers.error('semver.base') };
    }
  },
});
```

### 3.3 Yup (Form Validation Focus)

#### Overview
Yup is a JavaScript schema builder for value parsing and validation, commonly used with form libraries.

#### Installation
```bash
npm install yup
```

#### Core Features

```typescript
import * as yup from 'yup';

// Basic schema
const UserSchema = yup.object({
  name: yup.string().required(),
  age: yup.number().positive().integer().required(),
  email: yup.string().email(),
  website: yup.string().url().nullable(),
  createdOn: yup.date().default(() => new Date()),
});

// TypeScript types
interface User {
  name: string;
  age: number;
  email?: string;
  website?: string | null;
  createdOn: Date;
}

// Validation
const isValid = await UserSchema.isValid({ name: 'john', age: 30 });
const user = await UserSchema.validate({ name: 'john', age: 30 });

// Cast (apply defaults and transforms)
const casted = UserSchema.cast({
  name: 'john',
  age: '30',  // Will be cast to number
});

// Nested objects
const ConfigSchema = yup.object({
  server: yup.object({
    host: yup.string().default('0.0.0.0'),
    port: yup.number().default(8080),
  }).default({}),
  database: yup.object({
    url: yup.string().required(),
    maxConnections: yup.number().min(1).max(100).default(10),
  }),
});

// Array validation
const PortsSchema = yup.array().of(yup.number().min(1)).min(1);

// Conditional validation
const ConditionalSchema = yup.object({
  isBig: yup.boolean(),
  count: yup.number().when('isBig', {
    is: true,
    then: (schema) => schema.min(100),
    otherwise: (schema) => schema.min(0),
  }),
});

// Custom tests
const PasswordSchema = yup.string().test(
  'password-strength',
  'Password must contain uppercase, lowercase, and number',
  (value) => {
    if (!value) return false;
    return /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
  }
);
```

### 3.4 Valibot (Minimal Bundle)

#### Overview
Valibot is a schema library with a small bundle size and modular design.

#### Installation
```bash
npm install valibot
```

#### Core Features

```typescript
import * as v from 'valibot';

// Basic schema
const StringSchema = v.string();
const NumberSchema = v.number();

// Object schema
const ConfigSchema = v.object({
  host: v.optional(v.string(), '0.0.0.0'),
  port: v.optional(v.number(), 8080),
  ssl: v.optional(v.boolean(), false),
});

// Type inference
type Config = v.InferOutput<typeof ConfigSchema>;

// Validation
const result = v.safeParse(ConfigSchema, { port: 3000 });

if (result.success) {
  console.log(result.output);
} else {
  console.error(result.issues);
}

// Pipes for transforms
const PortSchema = v.pipe(
  v.string(),
  v.transform((val) => parseInt(val, 10)),
  v.number(),
  v.minValue(1),
  v.maxValue(65535)
);

// Unions
const SourceSchema = v.union([
  v.object({ type: v.literal('file'), path: v.string() }),
  v.object({ type: v.literal('env'), prefix: v.string() }),
]);

// Async validation
const AsyncSchema = v.pipeAsync(
  v.string(),
  v.checkAsync(async (val) => {
    const exists = await checkDatabase(val);
    return exists;
  }, 'Value not found')
);
```

### 3.5 Library Comparison

| Feature | Zod | Joi | Yup | Valibot |
|---------|-----|-----|-----|---------|
| **Type Inference** | ✅ Excellent | ⚠️ Good | ✅ Good | ✅ Good |
| **Bundle Size** | ~15KB | ~45KB | ~25KB | ~8KB |
| **TypeScript-First** | ✅ Native | ⚠️ Via @types | ⚠️ Via @types | ✅ Native |
| **Tree Shakable** | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **Defaults** | ✅ `.default()` | ✅ `.default()` | ✅ `.default()` | ✅ `v.optional(x, default)` |
| **Transforms** | ✅ `.transform()` | ✅ `.convert()` | ✅ `.cast()` | ✅ `v.pipe()` |
| **Async Validation** | ✅ `.refine(async)` | ✅ | ✅ | ✅ `v.pipeAsync()` |
| **Error Messages** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Ecosystem** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Learning Curve** | Low | Medium | Low | Low |

### 3.6 Validation Library Selection

```typescript
// Decision matrix for validation library selection

// 1. TypeScript-first, type inference critical → Zod
import { z } from 'zod';
const ZodConfig = z.object({
  port: z.number().default(8080),
});
type Config = z.infer<typeof ZodConfig>;

// 2. Bundle size critical (browser/edge) → Valibot
import * as v from 'valibot';
const ValibotConfig = v.object({
  port: v.optional(v.number(), 8080),
});
type Config = v.InferOutput<typeof ValibotConfig>;

// 3. Existing Joi ecosystem → Joi
import Joi from 'joi';
const JoiConfig = Joi.object({
  port: Joi.number().default(8080),
});

// 4. Form-heavy application → Yup
import * as yup from 'yup';
const YupConfig = yup.object({
  port: yup.number().default(8080),
});
```

---

## 4. Configuration Hierarchy Patterns

### 4.1 Priority-Based Merging

The standard configuration hierarchy follows this priority (highest to lowest):

```
┌─────────────────────────────────────────────────────────────┐
│                    Configuration Hierarchy                     │
├─────────────────────────────────────────────────────────────┤
│ Priority 1: CLI Arguments (--port 8080)                     │
│         ↓                                                   │
│ Priority 2: Environment Variables (PORT=8080)               │
│         ↓                                                   │
│ Priority 3: Secret Managers (Vault, AWS SM)                 │
│         ↓                                                   │
│ Priority 4: Environment-Specific Files (config/prod.yaml) │
│         ↓                                                   │
│ Priority 5: Default Config Files (config/default.yaml)      │
│         ↓                                                   │
│ Priority 6: Built-in Defaults (hardcoded)                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation Patterns

```typescript
// Configuration source types
interface ConfigSource {
  type: 'cli' | 'env' | 'file' | 'vault' | 'defaults';
  priority: number;
  load(): Promise<Record<string, unknown>>;
  watch?(callback: (config: Record<string, unknown>) => void): void;
}

// Merge strategy
interface MergeStrategy {
  // Deep merge objects
  merge(target: any, source: any, path: string[]): any;
  // Handle arrays
  mergeArrays(target: any[], source: any[]): any[];
  // Handle conflicts
  onConflict?(path: string[], targetValue: any, sourceValue: any): any;
}

// Implementation
class PriorityMergeStrategy implements MergeStrategy {
  merge(target: any, source: any, path: string[] = []): any {
    if (source === undefined) return target;
    if (target === undefined) return source;
    
    if (typeof source !== 'object' || source === null) {
      return source;  // Higher priority wins
    }
    
    if (Array.isArray(source)) {
      return this.mergeArrays(target, source);
    }
    
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      const currentPath = [...path, key];
      if (key in result) {
        result[key] = this.merge(result[key], value, currentPath);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  
  mergeArrays(target: any[], source: any[]): any[] {
    // Higher priority array replaces lower priority
    return source;
  }
}
```

### 4.3 Environment-Specific Configuration

```typescript
// Environment-specific file loading
class EnvironmentConfigLoader {
  private environments = ['default', 'local', 'development', 'staging', 'production'];
  
  async load(environment: string): Promise<Config> {
    const configs: Partial<Config>[] = [];
    
    // Always load default first
    configs.push(await this.loadFile('config/default.yaml'));
    
    // Load environment-specific if exists
    const envConfig = await this.loadFile(`config/${environment}.yaml`);
    if (envConfig) {
      configs.push(envConfig);
    }
    
    // Load local overrides (gitignored)
    const localConfig = await this.loadFile('config/local.yaml');
    if (localConfig) {
      configs.push(localConfig);
    }
    
    // Merge all
    return configs.reduce((acc, config) =>
      this.merge(acc, config), {} as Config
    );
  }
  
  private async loadFile(path: string): Promise<Partial<Config> | null> {
    try {
      const content = await readFile(path, 'utf-8');
      return YAML.parse(content);
    } catch {
      return null;
    }
  }
}
```

### 4.4 CLI Arguments Integration

```typescript
import { parseArgs } from 'node:util';

interface CLIOptions {
  port?: number;
  host?: string;
  config?: string;
  env?: string;
  verbose?: boolean;
}

function parseCLI(): CLIOptions {
  const { values } = parseArgs({
    options: {
      port: { type: 'string' },
      host: { type: 'string' },
      config: { type: 'string', short: 'c' },
      env: { type: 'string', short: 'e' },
      verbose: { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
  });
  
  return {
    port: values.port ? parseInt(values.port, 10) : undefined,
    host: values.host,
    config: values.config,
    env: values.env,
    verbose: values.verbose,
  };
}

// Schema for CLI validation
const CLISchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).optional(),
  host: z.string().optional(),
  config: z.string().optional(),
  env: z.enum(['development', 'staging', 'production']).optional(),
  verbose: z.boolean().optional(),
});
```

### 4.5 Environment Variable Conventions

```typescript
// Environment variable transformation
class EnvVarTransformer {
  private prefix: string;
  private separator: string;
  
  constructor(options: { prefix?: string; separator?: string } = {}) {
    this.prefix = options.prefix || '';
    this.separator = options.separator || '__';
  }
  
  // PH_DATABASE__HOST → database.host
  transform(key: string): string | null {
    if (this.prefix && !key.startsWith(this.prefix)) {
      return null;
    }
    
    const withoutPrefix = this.prefix
      ? key.slice(this.prefix.length)
      : key;
    
    return withoutPrefix
      .toLowerCase()
      .split(this.separator)
      .join('.');
  }
  
  // Reverse: database.host → PH_DATABASE__HOST
  reverse(path: string[]): string {
    return this.prefix + path.join(this.separator).toUpperCase();
  }
}

// Usage
const transformer = new EnvVarTransformer({ prefix: 'PH_' });

const envVars = {
  PH_SERVER__PORT: '8080',
  PH_DATABASE__URL: 'postgres://localhost/myapp',
  PH_FEATURES__CACHE: 'true',
};

const config: Record<string, any> = {};
for (const [key, value] of Object.entries(envVars)) {
  const path = transformer.transform(key);
  if (path) {
    setByPath(config, path, parseEnvValue(value));
  }
}

// Parse environment values intelligently
function parseEnvValue(value: string): any {
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Null/undefined
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  
  // Number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  
  // JSON
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  // String (default)
  return value;
}

// Helper to set nested value by path
function setByPath(obj: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
}
```

---

## 5. Environment Variable Handling

### 5.1 dotenv Patterns

```typescript
import { config as dotenvConfig } from 'dotenv';
import { expand } from 'dotenv-expand';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Basic dotenv
dotenvConfig();

// Advanced dotenv with expansion
const envConfig = dotenvConfig({
  path: resolve(process.cwd(), '.env'),
  encoding: 'utf8',
  debug: process.env.DEBUG === 'true',
});

// Expand variables (DATABASE_URL=$HOST:$PORT/db)
expand(envConfig);

// Multiple environment files
const envFiles = [
  '.env',
  `.env.${process.env.NODE_ENV}`,
  '.env.local',
];

for (const file of envFiles) {
  try {
    const content = readFileSync(file, 'utf-8');
    const config = dotenvConfig({ path: file });
    expand(config);
  } catch {
    // File doesn't exist, skip
  }
}
```

### 5.2 envalid Integration

```typescript
import { cleanEnv, str, num, bool, url, json, host, port, makeValidator } from 'envalid';

// Custom validator
const duration = makeValidator<number>((input) => {
  const match = input.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error('Invalid duration format. Use: <number><ms|s|m|h|d>');
  }
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

// Environment validation
const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'staging', 'production'] }),
  PORT: port({ default: 8080 }),
  HOST: host({ default: '0.0.0.0' }),
  DATABASE_URL: url(),
  REDIS_URL: url({ default: undefined }),
  LOG_LEVEL: str({ choices: ['debug', 'info', 'warn', 'error'], default: 'info' }),
  API_KEY: str({ default: undefined }),
  FEATURE_FLAGS: json({ default: {} }),
  CACHE_TTL: duration({ default: '5m' }),  // 5 minutes in ms
  ENABLE_METRICS: bool({ default: false }),
  MAX_CONNECTIONS: num({ default: 100, min: 1, max: 1000 }),
});

// Typed environment
console.log(env.PORT);  // number
console.log(env.DATABASE_URL);  // string (validated URL)
console.log(env.NODE_ENV);  // 'development' | 'test' | 'staging' | 'production'
```

### 5.3 Type-Safe Environment

```typescript
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_KEYS: z.string().transform((val) => val.split(',')).optional(),
  FEATURE_FLAGS: z.preprocess(
    (val) => (typeof val === 'string' ? JSON.parse(val) : val),
    z.record(z.boolean()).default({})
  ),
});

// Validate and parse
type Environment = z.infer<typeof EnvSchema>;

const env: Environment = EnvSchema.parse(process.env);

// Strict mode - fail on unknown env vars
const StrictEnvSchema = EnvSchema.strict();

// With refinements
const RefinedEnvSchema = EnvSchema.refine(
  (data) => {
    if (data.NODE_ENV === 'production' && !data.REDIS_URL) {
      return false;
    }
    return true;
  },
  { message: 'REDIS_URL is required in production' }
);
```

---

## 6. TypeScript Type Generation from Schemas

### 6.1 Zod Type Inference

```typescript
import { z } from 'zod';

// Schema definition
const ConfigSchema = z.object({
  server: z.object({
    port: z.number().default(8080),
    host: z.string().default('0.0.0.0'),
    ssl: z.object({
      enabled: z.boolean().default(false),
      cert: z.string().optional(),
    }).default({ enabled: false }),
  }).default({}),
  
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().min(1).default(10),
  }),
  
  features: z.record(z.boolean()).default({}),
  
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }).default({}),
});

// Automatic type inference
type Config = z.infer<typeof ConfigSchema>;

// Generated type:
type Config = {
  server: {
    port: number;
    host: string;
    ssl: {
      enabled: boolean;
      cert?: string;
    };
  };
  database: {
    url: string;
    poolSize: number;
  };
  features: Record<string, boolean>;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
  };
}

// Usage with full type safety
const config: Config = ConfigSchema.parse(rawConfig);

// Access with autocomplete
const port = config.server.port;  // number
const level = config.logging.level;  // 'debug' | 'info' | 'warn' | 'error'
```

### 6.2 JSON Schema to TypeScript

```typescript
// Using json-schema-to-typescript
import { compile } from 'json-schema-to-typescript';

const jsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Config',
  type: 'object',
  properties: {
    server: {
      type: 'object',
      properties: {
        port: { type: 'integer', minimum: 1, maximum: 65535, default: 8080 },
        host: { type: 'string', default: '0.0.0.0' },
      },
      required: ['port'],
    },
    database: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        poolSize: { type: 'integer', default: 10 },
      },
      required: ['url'],
    },
  },
  required: ['server', 'database'],
};

// Generate TypeScript
const tsTypes = await compile(jsonSchema, 'Config', {
  bannerComment: '/* Generated from JSON Schema */',
  additionalProperties: false,
});

// Output:
/* Generated from JSON Schema */
export interface Config {
  server: {
    port: number;
    host?: string;
  };
  database: {
    url: string;
    poolSize?: number;
  };
}
```

### 6.3 Path-Based Type Safety

```typescript
import { z } from 'zod';

type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends Record<string, any>
    ? `${K}.${Path<T[K]>}` | K
    : K
  : never;

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// Usage with ConfigManager
class ConfigManager<TSchema extends z.ZodTypeAny> {
  private config: z.infer<TSchema>;
  
  constructor(
    private schema: TSchema,
    initialConfig: unknown
  ) {
    this.config = schema.parse(initialConfig);
  }
  
  get<Path extends string>(
    path: Path & Path<z.infer<TSchema>>
  ): PathValue<z.infer<TSchema>, Path> {
    return path.split('.').reduce((obj, key) => obj[key], this.config as any);
  }
  
  set<Path extends string>(
    path: Path & Path<z.infer<TSchema>>,
    value: PathValue<z.infer<TSchema>, Path>
  ): void {
    const keys = path.split('.');
    const last = keys.pop()!;
    const target = keys.reduce((obj, key) => obj[key], this.config as any);
    target[last] = value;
  }
}

// Usage
const manager = new ConfigManager(ConfigSchema, rawConfig);

// Type-safe get
const port = manager.get('server.port');  // number
const sslEnabled = manager.get('server.ssl.enabled');  // boolean
const dbUrl = manager.get('database.url');  // string

// Type-safe set
manager.set('server.port', 3000);  // ✅ OK
manager.set('server.port', '3000');  // ❌ Type error
```

---

## 7. Hot Reloading Implementations

### 7.1 File Watching Strategies

```typescript
import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';

interface ReloadOptions {
  paths: string | string[];
  ignore?: string[];
  debounceMs?: number;
  followSymlinks?: boolean;
}

interface ConfigChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  previousValue?: any;
  newValue: any;
}

class HotReloader extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private currentConfig: any;
  
  constructor(
    private loadConfig: () => Promise<any>,
    private options: ReloadOptions
  ) {
    super();
  }
  
  async start(): Promise<void> {
    this.currentConfig = await this.loadConfig();
    
    this.watcher = watch(this.options.paths, {
      ignored: this.options.ignore || ['node_modules/**', '.git/**'],
      persistent: true,
      followSymlinks: this.options.followSymlinks ?? false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });
    
    this.watcher.on('add', (path) => this.handleChange('add', path));
    this.watcher.on('change', (path) => this.handleChange('change', path));
    this.watcher.on('unlink', (path) => this.handleChange('unlink', path));
    this.watcher.on('error', (error) => this.emit('error', error));
  }
  
  private handleChange(type: 'add' | 'change' | 'unlink', path: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(async () => {
      try {
        const previousConfig = this.currentConfig;
        this.currentConfig = await this.loadConfig();
        
        const changes = this.diff(previousConfig, this.currentConfig);
        
        for (const change of changes) {
          this.emit('change', {
            type,
            path,
            ...change,
          });
        }
        
        this.emit('reload', this.currentConfig);
      } catch (error) {
        this.emit('error', error);
      }
    }, this.options.debounceMs ?? 100);
  }
  
  private diff(prev: any, current: any, basePath = ''): Array<{ path: string; previousValue: any; newValue: any }> {
    const changes: Array<{ path: string; previousValue: any; newValue: any }> = [];
    const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(current || {})]);
    
    for (const key of allKeys) {
      const path = basePath ? `${basePath}.${key}` : key;
      const prevVal = prev?.[key];
      const currVal = current?.[key];
      
      if (typeof prevVal === 'object' && typeof currVal === 'object') {
        changes.push(...this.diff(prevVal, currVal, path));
      } else if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
        changes.push({ path, previousValue: prevVal, newValue: currVal });
      }
    }
    
    return changes;
  }
  
  stop(): void {
    this.watcher?.close();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// Usage
const reloader = new HotReloader(
  async () => {
    const content = await readFile('config.yaml', 'utf-8');
    return ConfigSchema.parse(YAML.parse(content));
  },
  {
    paths: ['config/', '.env'],
    ignore: ['config/secrets.yaml'],
    debounceMs: 500,
  }
);

reloader.on('change', (event) => {
  console.log(`Config changed: ${event.path} = ${event.previousValue} → ${event.newValue}`);
});

reloader.on('reload', (config) => {
  console.log('Configuration reloaded');
  updateApplicationConfig(config);
});

reloader.on('error', (error) => {
  console.error('Hot reload error:', error);
});

await reloader.start();
```

### 7.2 Signal-Based Reloading

```typescript
import { signal } from 'node:process';

class SignalReloader {
  private currentConfig: any;
  
  constructor(
    private loadConfig: () => Promise<any>,
    private signals: NodeJS.Signals[] = ['SIGUSR1', 'SIGUSR2', 'SIGHUP']
  ) {}
  
  async start(): Promise<void> {
    this.currentConfig = await this.loadConfig();
    
    for (const sig of this.signals) {
      process.on(sig, async () => {
        console.log(`Received ${sig}, reloading configuration...`);
        try {
          this.currentConfig = await this.loadConfig();
          console.log('Configuration reloaded successfully');
        } catch (error) {
          console.error('Failed to reload configuration:', error);
        }
      });
    }
  }
  
  getConfig(): any {
    return this.currentConfig;
  }
}

// Usage
const reloader = new SignalReloader(async () => {
  return loadConfiguration();
});

await reloader.start();

// Trigger reload with: kill -SIGUSR1 <pid>
```

### 7.3 HTTP/WebSocket Based Reloading

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

class WebSocketConfigServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  
  constructor(
    private loadConfig: () => Promise<any>,
    port: number = 8765
  ) {
    const server = createServer();
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      ws.on('close', () => {
        this.clients.delete(ws);
      });
      
      ws.on('message', async (message) => {
        const data = JSON.parse(message.toString());
        
        if (data.action === 'get') {
          const config = await this.loadConfig();
          ws.send(JSON.stringify({ type: 'config', data: config }));
        }
        
        if (data.action === 'reload') {
          await this.broadcastReload();
        }
      });
    });
    
    server.listen(port);
  }
  
  async broadcastReload(): Promise<void> {
    const config = await this.loadConfig();
    const message = JSON.stringify({ type: 'reload', data: config });
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
  
  async pushUpdate(path: string, value: any): Promise<void> {
    const message = JSON.stringify({
      type: 'update',
      path,
      value,
    });
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

// Client-side implementation
class ConfigClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectInterval = 5000;
  private config: any;
  
  constructor(private url: string) {
    super();
  }
  
  connect(): void {
    this.ws = new WebSocket(this.url);
    
    this.ws.on('open', () => {
      this.emit('connected');
      // Request initial config
      this.ws?.send(JSON.stringify({ action: 'get' }));
    });
    
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'config':
        case 'reload':
          this.config = message.data;
          this.emit('reload', this.config);
          break;
        case 'update':
          this.setByPath(this.config, message.path, message.value);
          this.emit('change', message.path, message.value);
          break;
      }
    });
    
    this.ws.on('close', () => {
      this.emit('disconnected');
      setTimeout(() => this.connect(), this.reconnectInterval);
    });
    
    this.ws.on('error', (error) => {
      this.emit('error', error);
    });
  }
  
  getConfig(): any {
    return this.config;
  }
  
  private setByPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
}
```

---

## 8. Configuration Servers

### 8.1 Spring Cloud Config Pattern

```typescript
// Remote configuration server client
interface ConfigServerClient {
  application: string;
  profile: string;
  label?: string;
  uri: string;
  username?: string;
  password?: string;
}

class SpringCloudConfigClient {
  private cachedConfig: any;
  private etag: string | null = null;
  
  constructor(private options: ConfigServerClient) {}
  
  async fetch(): Promise<any> {
    const url = `${this.options.uri}/${this.options.application}/${this.options.profile}/${this.options.label || 'main'}`;
    
    const headers: Record<string, string> = {};
    if (this.etag) {
      headers['If-None-Match'] = this.etag;
    }
    
    if (this.options.username) {
      const auth = Buffer.from(`${this.options.username}:${this.options.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (response.status === 304) {
      return this.cachedConfig;  // Not modified
    }
    
    if (!response.ok) {
      throw new Error(`Config server returned ${response.status}`);
    }
    
    this.etag = response.headers.get('ETag');
    const data = await response.json();
    
    // Spring Cloud Config format: { propertySources: [...] }
    this.cachedConfig = data.propertySources.reduce((acc: any, source: any) => {
      return this.mergeDeep(acc, source.source);
    }, {});
    
    return this.cachedConfig;
  }
  
  private mergeDeep(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
```

### 8.2 Consul Integration

```typescript
import { Consul } from 'consul';

interface ConsulConfig {
  host: string;
  port: number;
  secure?: boolean;
  token?: string;
}

class ConsulConfigClient {
  private consul: Consul;
  private watchers: Map<string, any> = new Map();
  
  constructor(options: ConsulConfig) {
    this.consul = new Consul({
      host: options.host,
      port: options.port,
      secure: options.secure,
      defaults: {
        token: options.token,
      },
    });
  }
  
  async get(key: string): Promise<any> {
    const result = await this.consul.kv.get(key);
    if (!result) {
      throw new Error(`Key not found: ${key}`);
    }
    
    const value = Buffer.from(result.Value, 'base64').toString('utf-8');
    
    // Try JSON parse
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  async getPrefix(prefix: string): Promise<Record<string, any>> {
    const results = await this.consul.kv.get({ key: prefix, recurse: true });
    
    if (!results || !Array.isArray(results)) {
      return {};
    }
    
    const config: Record<string, any> = {};
    
    for (const result of results) {
      const key = result.Key.slice(prefix.length + 1);  // Remove prefix
      const value = Buffer.from(result.Value, 'base64').toString('utf-8');
      
      // Parse nested structure from key path
      this.setNestedValue(config, key.split('/'), this.parseValue(value));
    }
    
    return config;
  }
  
  watch(key: string, callback: (value: any) => void): void {
    const watcher = this.consul.watch({
      method: this.consul.kv.get,
      options: { key },
    });
    
    watcher.on('change', (data) => {
      if (data) {
        const value = Buffer.from(data.Value, 'base64').toString('utf-8');
        callback(this.parseValue(value));
      }
    });
    
    watcher.on('error', (err) => {
      console.error('Consul watch error:', err);
    });
    
    this.watchers.set(key, watcher);
  }
  
  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      // Try boolean
      if (value === 'true') return true;
      if (value === 'false') return false;
      // Try number
      if (/^-?\d+$/.test(value)) return parseInt(value, 10);
      if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
      // Return as string
      return value;
    }
  }
  
  private setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }
}
```

### 8.3 etcd Integration

```typescript
import { Etcd3 } from 'etcd3';

class EtcdConfigClient {
  private client: Etcd3;
  private watchers: Map<string, any> = new Map();
  
  constructor(options: { endpoints: string[]; auth?: { username: string; password: string } }) {
    this.client = new Etcd3({
      hosts: options.endpoints,
      auth: options.auth,
    });
  }
  
  async get(key: string): Promise<any> {
    const value = await this.client.get(key).string();
    return this.parseValue(value);
  }
  
  async getPrefix(prefix: string): Promise<Record<string, any>> {
    const data = await this.client.getAll().prefix(prefix).strings();
    
    const config: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const shortKey = key.slice(prefix.length);
      this.setNestedValue(config, shortKey.split('/'), this.parseValue(value));
    }
    
    return config;
  }
  
  watch(key: string, callback: (value: any) => void): void {
    const watcher = this.client.watch();
    watcher.on('put', (res) => {
      if (res.key.toString() === key) {
        callback(this.parseValue(res.value.toString()));
      }
    });
    watcher.create(key);
    
    this.watchers.set(key, watcher);
  }
  
  private parseValue(value: string | null): any {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  
  private setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }
  
  async close(): Promise<void> {
    await this.client.close();
  }
}
```

---

## 9. Secret Management in Configuration

### 9.1 HashiCorp Vault Integration

```typescript
import { VaultClient } from 'vault-client';
import NodeVault from 'node-vault';

interface VaultOptions {
  endpoint: string;
  token?: string;
  roleId?: string;
  secretId?: string;
  namespace?: string;
}

class VaultConfigSource {
  private client: NodeVault.client;
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private cacheTtl: number = 5 * 60 * 1000;  // 5 minutes
  
  constructor(private options: VaultOptions) {
    this.client = NodeVault({
      apiVersion: 'v1',
      endpoint: options.endpoint,
      token: options.token,
      namespace: options.namespace,
    });
  }
  
  async authenticate(): Promise<void> {
    if (this.options.roleId && this.options.secretId) {
      // AppRole authentication
      const result = await this.client.approleLogin({
        role_id: this.options.roleId,
        secret_id: this.options.secretId,
      });
      this.client.token = result.auth.client_token;
    }
  }
  
  async getSecret(path: string, key?: string): Promise<any> {
    const cacheKey = `${path}:${key || '__all__'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const result = await this.client.read(path);
    const value = key ? result.data.data[key] : result.data.data;
    
    this.cache.set(cacheKey, {
      value,
      expiry: Date.now() + this.cacheTtl,
    });
    
    return value;
  }
  
  async loadConfig(path: string): Promise<Record<string, any>> {
    const result = await this.client.read(path);
    return result.data.data;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

// Usage with config manager
const vaultSource = new VaultConfigSource({
  endpoint: 'https://vault.example.com:8200',
  roleId: process.env.VAULT_ROLE_ID,
  secretId: process.env.VAULT_SECRET_ID,
});

await vaultSource.authenticate();
const dbPassword = await vaultSource.getSecret('secret/data/database', 'password');
```

### 9.2 AWS Secrets Manager Integration

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class AWSSecretsManagerSource {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private cacheTtl: number = 5 * 60 * 1000;
  
  constructor(region: string = 'us-east-1') {
    this.client = new SecretsManagerClient({ region });
  }
  
  async getSecret(secretId: string, key?: string): Promise<any> {
    const cacheKey = `${secretId}:${key || '__all__'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await this.client.send(command);
    
    let value: any;
    if (response.SecretString) {
      value = JSON.parse(response.SecretString);
    } else if (response.SecretBinary) {
      value = Buffer.from(response.SecretBinary as Uint8Array).toString('utf-8');
    }
    
    if (key) {
      value = value[key];
    }
    
    this.cache.set(cacheKey, {
      value,
      expiry: Date.now() + this.cacheTtl,
    });
    
    return value;
  }
  
  async loadConfig(secretId: string): Promise<Record<string, any>> {
    return await this.getSecret(secretId);
  }
}
```

### 9.3 Azure Key Vault Integration

```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

class AzureKeyVaultSource {
  private client: SecretClient;
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private cacheTtl: number = 5 * 60 * 1000;
  
  constructor(vaultUrl: string) {
    const credential = new DefaultAzureCredential();
    this.client = new SecretClient(vaultUrl, credential);
  }
  
  async getSecret(name: string): Promise<string> {
    const cached = this.cache.get(name);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const secret = await this.client.getSecret(name);
    
    this.cache.set(name, {
      value: secret.value,
      expiry: Date.now() + this.cacheTtl,
    });
    
    return secret.value!;
  }
  
  async loadConfig(prefix?: string): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {};
    
    for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
      if (prefix && !secretProperties.name.startsWith(prefix)) {
        continue;
      }
      
      const secret = await this.getSecret(secretProperties.name);
      const key = prefix
        ? secretProperties.name.slice(prefix.length)
        : secretProperties.name;
      
      secrets[key] = secret;
    }
    
    return secrets;
  }
}
```

### 9.4 GCP Secret Manager Integration

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

class GCPSecretManagerSource {
  private client: SecretManagerServiceClient;
  private projectId: string;
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private cacheTtl: number = 5 * 60 * 1000;
  
  constructor(projectId: string) {
    this.client = new SecretManagerServiceClient();
    this.projectId = projectId;
  }
  
  async getSecret(name: string, version: string = 'latest'): Promise<string> {
    const cacheKey = `${name}:${version}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    
    const [secret] = await this.client.accessSecretVersion({
      name: `projects/${this.projectId}/secrets/${name}/versions/${version}`,
    });
    
    const value = secret.payload?.data?.toString() || '';
    
    this.cache.set(cacheKey, {
      value,
      expiry: Date.now() + this.cacheTtl,
    });
    
    return value;
  }
  
  async loadConfig(prefix?: string): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {};
    
    const [secretList] = await this.client.listSecrets({
      parent: `projects/${this.projectId}`,
    });
    
    for (const secret of secretList) {
      if (!secret.name) continue;
      
      const name = secret.name.split('/').pop()!;
      if (prefix && !name.startsWith(prefix)) {
        continue;
      }
      
      const value = await this.getSecret(name);
      const key = prefix ? name.slice(prefix.length) : name;
      secrets[key] = value;
    }
    
    return secrets;
  }
}
```

### 9.5 Secret Injection Patterns

```typescript
// Pattern 1: Template-based secret injection
interface SecretTemplate {
  pattern: RegExp;
  resolve: (match: RegExpMatchArray) => Promise<string>;
}

class SecretInjector {
  private templates: SecretTemplate[] = [
    // ${vault:secret/data/database:password}
    {
      pattern: /\$\{vault:([^:]+):([^}]+)\}/g,
      resolve: async (match) => {
        const [, path, key] = match;
        return await vaultSource.getSecret(path, key);
      },
    },
    // ${aws:secret-id:key}
    {
      pattern: /\$\{aws:([^:]+):([^}]+)\}/g,
      resolve: async (match) => {
        const [, secretId, key] = match;
        return await awsSource.getSecret(secretId, key);
      },
    },
    // ${env:VARIABLE_NAME}
    {
      pattern: /\$\{env:([^}]+)\}/g,
      resolve: async (match) => {
        const [, varName] = match;
        const value = process.env[varName];
        if (!value) {
          throw new Error(`Environment variable ${varName} not found`);
        }
        return value;
      },
    },
  ];
  
  async inject(config: any): Promise<any> {
    if (typeof config === 'string') {
      return await this.injectString(config);
    }
    
    if (Array.isArray(config)) {
      return await Promise.all(config.map((item) => this.inject(item)));
    }
    
    if (typeof config === 'object' && config !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(config)) {
        result[key] = await this.inject(value);
      }
      return result;
    }
    
    return config;
  }
  
  private async injectString(str: string): Promise<string> {
    let result = str;
    
    for (const template of this.templates) {
      const matches = Array.from(str.matchAll(template.pattern));
      
      for (const match of matches) {
        const replacement = await template.resolve(match);
        result = result.replace(match[0], replacement);
      }
    }
    
    return result;
  }
}

// Pattern 2: Schema-based secret fields
import { z } from 'zod';

const SecretFieldSchema = z.object({
  _secret: z.literal(true),
  provider: z.enum(['vault', 'aws', 'azure', 'gcp']),
  path: z.string(),
  key: z.string().optional(),
  cache: z.boolean().default(true),
});

type SecretField = z.infer<typeof SecretFieldSchema>;

// Example usage in config
const configWithSecrets = {
  database: {
    host: 'localhost',
    password: {
      _secret: true,
      provider: 'vault',
      path: 'secret/data/database',
      key: 'password',
    } as SecretField,
  },
};

// Resolver that processes secret fields
class SecretResolver {
  constructor(
    private sources: Record<string, SecretSource>
  ) {}
  
  async resolve(value: any): Promise<any> {
    if (this.isSecretField(value)) {
      const source = this.sources[value.provider];
      if (!source) {
        throw new Error(`Unknown secret provider: ${value.provider}`);
      }
      return await source.getSecret(value.path, value.key);
    }
    
    if (typeof value === 'object' && value !== null) {
      const result: any = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = await this.resolve(v);
      }
      return result;
    }
    
    return value;
  }
  
  private isSecretField(value: any): value is SecretField {
    return typeof value === 'object' && value !== null && value._secret === true;
  }
}
```

---

## 10. References

### Standards and Specifications

1. **YAML 1.2 Specification** - yaml.org/spec/1.2.2/
2. **TOML 1.0.0 Specification** - toml.io/en/v1.0.0
3. **JSON Schema Draft 2020-12** - json-schema.org/
4. **RFC 8259 - JSON** - tools.ietf.org/html/rfc8259
5. **HOCON Specification** - github.com/lightbend/config/blob/main/HOCON.md

### Libraries and Tools

| Name | URL | Purpose |
|------|-----|---------|
| Zod | zod.dev | TypeScript schema validation |
| Joi | joi.dev | JavaScript schema validation |
| Yup | github.com/jquense/yup | Form validation |
| Valibot | valibot.dev | Lightweight validation |
| envalid | github.com/af/envalid | Environment validation |
| dotenv | github.com/motdotla/dotenv | Environment files |
| chokidar | github.com/paulmillr/chokidar | File watching |
| yaml | github.com/eemeli/yaml | YAML parsing |
| @iarna/toml | github.com/iarna/iarna-toml | TOML parsing |

### Configuration Management Systems

1. **Spring Cloud Config** - cloud.spring.io/spring-cloud-config/
2. **Consul** - consul.io/
3. **etcd** - etcd.io/
4. **AWS AppConfig** - aws.amazon.com/systems-manager/features/appconfig/
5. **Azure App Configuration** - azure.microsoft.com/services/app-configuration/
6. **GCP Runtime Configurator** - cloud.google.com/deployment-manager/runtime-configurator/

### Secret Management

1. **HashiCorp Vault** - vaultproject.io/
2. **AWS Secrets Manager** - aws.amazon.com/secrets-manager/
3. **Azure Key Vault** - azure.microsoft.com/services/key-vault/
4. **GCP Secret Manager** - cloud.google.com/secret-manager/
5. **1Password Secrets Automation** - 1password.com/secrets/
6. **Doppler** - doppler.com/

### Research Papers and Articles

1. "Configuration Management at Scale" - Netflix Tech Blog
2. "The Twelve-Factor App: Config" - 12factor.net/config
3. "Configuration Complexity Clock" - mikehadlow.blogspot.com/2012/05/configuration-complexity-clock.html
4. "Configuration Files are Code" - sobes.io/blog/configuration-files-are-code/

---

## Document Metadata

- **Version**: 1.0.0
- **Last Updated**: 2026-04-02
- **Maintainer**: Phenotype Architecture Team
- **Review Cycle**: Quarterly
- **Status**: Active Research

---

*This document is a living research artifact. Updates should be proposed via ADR process and approved by the architecture team.*
