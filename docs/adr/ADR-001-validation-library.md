# ADR-001: Validation Library Selection

## Status
**Proposed** → **Accepted** (pending review)

## Context

The phenotype-config-ts project requires a robust schema validation library to ensure type safety and runtime validation of configuration data. This decision impacts:

1. **Developer Experience**: How easy it is to define and maintain schemas
2. **Bundle Size**: Impact on application performance and loading times
3. **Type Safety**: Quality of TypeScript type inference
4. **Ecosystem**: Community support and integration with other tools
5. **Performance**: Validation speed and memory usage
6. **Maintenance**: Long-term sustainability of the chosen library

### Requirements

| Priority | Requirement | Description |
|----------|-------------|-------------|
| P0 | TypeScript-First | Native TypeScript support with type inference |
| P0 | Runtime Validation | Validate configuration at runtime |
| P0 | Bundle Size | Reasonable bundle size (<50KB) |
| P1 | Transform Support | Ability to transform values (parsing, coercion) |
| P1 | Default Values | Support for default values in schemas |
| P1 | Error Handling | Detailed, actionable error messages |
| P2 | Async Validation | Support for async validation when needed |
| P2 | Ecosystem | Active community and integrations |

### Candidates

After evaluating the landscape, four primary candidates were identified:

1. **Zod** - TypeScript-first schema validation with static type inference
2. **Joi** - Powerful schema description language for JavaScript
3. **Yup** - Schema builder for value parsing and validation
4. **Valibot** - Modular and lightweight validation library

## Decision

**Chosen**: **Zod** as the primary validation library, with **Valibot** as an alternative for bundle-size-critical environments.

## Consequences

### Positive

1. **Excellent TypeScript Integration**: Automatic type inference from schemas eliminates duplication
2. **Small Bundle Size**: ~15KB gzipped vs ~45KB for Joi
3. **Active Development**: Rapidly growing ecosystem and frequent updates
4. **Great Developer Experience**: Clean API with good error messages
5. **Transformations Built-In**: `.transform()`, `.preprocess()`, `.coerce()` methods
6. **Extensible**: Easy to add custom validations via `.refine()` and `.transform()`

### Negative

1. **Smaller Ecosystem**: Fewer integrations than Joi (though growing rapidly)
2. **Learning Curve**: Some advanced features require understanding of Zod's patterns
3. **Validation Only**: Less comprehensive than Joi for some edge cases
4. **No Built-in Internationalization**: Error messages in English only (extensible)

### Neutral

1. **Bundle size is acceptable** for most use cases
2. **Community is active** but not as large as Joi's
3. **Performance is good** but not the absolute fastest (Valibot is faster)

## Detailed Comparison

### Zod

#### Overview
Zod is designed specifically for TypeScript, with type inference as a core feature.

#### Installation
```bash
npm install zod
```

#### Bundle Size
- **Minified**: ~45KB
- **Gzipped**: ~15KB
- **Tree Shakable**: Yes

#### Example Usage
```typescript
import { z } from 'zod';

// Basic schema with type inference
const ConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1).max(65535).default(8080),
    host: z.string().default('0.0.0.0'),
    ssl: z.object({
      enabled: z.boolean().default(false),
      cert: z.string().optional(),
      key: z.string().optional(),
    }).default({ enabled: false }),
  }).default({}),
  
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().min(1).default(10),
  }),
  
  features: z.record(z.boolean()).default({}),
});

// Automatic type inference
type Config = z.infer<typeof ConfigSchema>;
// Generated type is fully typed with all defaults applied

// Parsing with full type safety
const config = ConfigSchema.parse(rawConfig);

// Safe parsing
const result = ConfigSchema.safeParse(rawConfig);
if (result.success) {
  // result.data is typed as Config
  console.log(result.data.server.port);  // number
} else {
  // result.error contains detailed error information
  console.error(result.error.flatten());
}
```

#### Advanced Features
```typescript
// Transforms and refinements
const PortSchema = z.preprocess(
  (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
  z.number().int().min(1).max(65535)
);

// Custom validation with refine
const StrongPasswordSchema = z.string().refine(
  (val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val),
  { message: 'Password must contain uppercase, lowercase, and number' }
);

// Discriminated unions for type-safe variants
const SourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('file'), path: z.string() }),
  z.object({ type: z.literal('env'), prefix: z.string() }),
  z.object({ type: z.literal('vault'), path: z.string(), mount: z.string() }),
]);

// Recursive schemas
const CategorySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(CategorySchema),
  })
);

// Brand types for nominal typing
const UserId = z.string().brand<'UserId'>();
type UserId = z.infer<typeof UserId>;

// Error customization
const CustomErrorSchema = z.object({
  email: z.string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  }).email('Please provide a valid email'),
});
```

#### Pros
- ✅ Native TypeScript support
- ✅ Automatic type inference
- ✅ Small bundle size
- ✅ Tree-shakeable
- ✅ Active development
- ✅ Good error messages
- ✅ Built-in transforms
- ✅ Extensive documentation

#### Cons
- ⚠️ Smaller ecosystem than Joi
- ⚠️ Error messages need customization for production
- ⚠️ Some advanced patterns have learning curve
- ⚠️ No built-in i18n support

### Joi

#### Overview
Joi is the most established validation library, with comprehensive validation capabilities.

#### Installation
```bash
npm install joi
```

#### Bundle Size
- **Minified**: ~130KB
- **Gzipped**: ~45KB
- **Tree Shakable**: No (monolithic)

#### Example Usage
```typescript
import Joi from 'joi';

// Schema definition
const ConfigSchema = Joi.object({
  server: Joi.object({
    port: Joi.number().integer().min(1).max(65535).default(8080),
    host: Joi.string().hostname().default('0.0.0.0'),
    ssl: Joi.object({
      enabled: Joi.boolean().default(false),
      cert: Joi.string().when('enabled', {
        is: true,
        then: Joi.required(),
      }),
    }).default({ enabled: false }),
  }).default({}),
  
  database: Joi.object({
    url: Joi.string().uri().required(),
    poolSize: Joi.number().min(1).default(10),
  }).required(),
}).options({ stripUnknown: true });

// Validation
const result = ConfigSchema.validate(rawConfig, {
  abortEarly: false,
  allowUnknown: true,
  convert: true,
});

if (result.error) {
  console.error(result.error.details);
} else {
  console.log(result.value);  // Validated and defaulted value
}
```

#### Advanced Features
```typescript
// Conditional validation
const DynamicSchema = Joi.object({
  type: Joi.string().valid('file', 'env', 'vault').required(),
  path: Joi.string().when('type', {
    is: Joi.valid('file', 'vault'),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

// References
const ReferenceSchema = Joi.object({
  min: Joi.number(),
  max: Joi.number().greater(Joi.ref('min')),
});

// Custom validation
const CustomSchema = Joi.extend({
  type: 'semver',
  messages: {
    'semver.base': '{{#label}} must be a valid semver',
  },
  validate(value, helpers) {
    if (!/^\d+\.\d+\.\d+/.test(value)) {
      return { value, errors: helpers.error('semver.base') };
    }
  },
});

// Alternatives (unions)
const SourceSchema = Joi.alternatives().try(
  Joi.object({ type: 'file', path: Joi.string().required() }),
  Joi.object({ type: 'env', prefix: Joi.string().required() }),
);
```

#### Pros
- ✅ Mature and battle-tested
- ✅ Comprehensive validation capabilities
- ✅ Excellent error messages
- ✅ Large ecosystem
- ✅ Conditional validation is powerful
- ✅ Built-in localization support

#### Cons
- ❌ Large bundle size (~45KB gzipped)
- ❌ Not tree-shakeable
- ❌ Requires @types/joi for TypeScript
- ❌ Type inference requires additional tools
- ❌ Slower than alternatives

### Yup

#### Overview
Yup is a schema builder with a focus on form validation, inspired by Joi but with a smaller footprint.

#### Installation
```bash
npm install yup
```

#### Bundle Size
- **Minified**: ~75KB
- **Gzipped**: ~25KB
- **Tree Shakable**: Partial

#### Example Usage
```typescript
import * as yup from 'yup';

// Schema definition
const ConfigSchema = yup.object({
  server: yup.object({
    port: yup.number().default(8080),
    host: yup.string().default('0.0.0.0'),
    ssl: yup.object({
      enabled: yup.boolean().default(false),
      cert: yup.string().when('enabled', {
        is: true,
        then: (schema) => schema.required(),
      }),
    }).default({}),
  }).default({}),
  
  database: yup.object({
    url: yup.string().url().required(),
    poolSize: yup.number().min(1).default(10),
  }),
});

// TypeScript types (manual)
interface Config {
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
}

// Validation
const config = await ConfigSchema.validate(rawConfig, {
  abortEarly: false,
  stripUnknown: true,
});

// Type casting
const casted = ConfigSchema.cast({
  port: '8080',  // Will be cast to number
});
```

#### Pros
- ✅ Smaller than Joi
- ✅ Good form validation integration
- ✅ Supports conditional validation
- ✅ Good test coverage

#### Cons
- ⚠️ No automatic type inference
- ⚠️ Manual type definitions required
- ⚠️ Less active development than Zod
- ⚠️ Not as TypeScript-native as Zod

### Valibot

#### Overview
Valibot is a modular validation library focused on minimal bundle size and maximum performance.

#### Installation
```bash
npm install valibot
```

#### Bundle Size
- **Minified**: ~20KB
- **Gzipped**: ~8KB
- **Tree Shakable**: Yes (fully modular)

#### Example Usage
```typescript
import * as v from 'valibot';

// Schema definition
const ConfigSchema = v.object({
  server: v.optional(v.object({
    port: v.optional(v.number(), 8080),
    host: v.optional(v.string(), '0.0.0.0'),
  }), {}),
  
  database: v.object({
    url: v.pipe(v.string(), v.url()),
    poolSize: v.optional(v.pipe(v.number(), v.minValue(1)), 10),
  }),
});

// Type inference
type Config = v.InferOutput<typeof ConfigSchema>;

// Parsing
const result = v.safeParse(ConfigSchema, rawConfig);

if (result.success) {
  console.log(result.output);
} else {
  console.error(result.issues);
}
```

#### Advanced Features
```typescript
// Pipes for transforms
const PortSchema = v.pipe(
  v.string(),
  v.transform((val) => parseInt(val, 10)),
  v.number(),
  v.minValue(1),
  v.maxValue(65535)
);

// Async validation
const AsyncSchema = v.pipeAsync(
  v.string(),
  v.checkAsync(async (val) => {
    const exists = await checkDatabase(val);
    return exists;
  }, 'Value not found')
);
```

#### Pros
- ✅ Smallest bundle size
- ✅ Fully modular (import only what you need)
- ✅ Fastest performance
- ✅ Native TypeScript support
- ✅ Tree-shakeable

#### Cons
- ⚠️ Smaller ecosystem
- ⚠️ Newer library (less battle-tested)
- ⚠️ Fewer built-in validators than Zod
- ⚠️ API can be verbose for complex schemas

## Comparison Matrix

| Criteria | Zod | Joi | Yup | Valibot |
|----------|-----|-----|-----|---------|
| **Bundle Size (gzipped)** | ~15KB | ~45KB | ~25KB | ~8KB |
| **Tree Shakable** | ✅ Yes | ❌ No | ⚠️ Partial | ✅ Yes |
| **Type Inference** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **TypeScript Native** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Ecosystem** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Error Messages** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Documentation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Conditional Logic** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Maintenance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Learning Curve** | Low | Medium | Low | Low |

## Decision Rationale

### Why Zod?

1. **TypeScript-First Design**
   - Native TypeScript support without additional dependencies
   - Automatic type inference eliminates duplication
   - Schema serves as single source of truth

2. **Bundle Size vs. Features**
   - At ~15KB gzipped, it's reasonable for most applications
   - Significantly smaller than Joi
   - Only 7KB larger than Valibot but with better DX

3. **Active Development**
   - Rapid release cycle with frequent improvements
   - Growing ecosystem (zod-form-data, zod-to-json-schema, etc.)
   - Strong community adoption

4. **Developer Experience**
   - Clean, intuitive API
   - Good error messages out of the box
   - Excellent documentation
   - Extensive test coverage

5. **Extensibility**
   - Easy to add custom validations via `.refine()`
   - Transform support for parsing/coercion
   - Brand types for nominal typing
   - Recursive schema support

### When to Consider Valibot?

Valibot should be considered for:
- Browser/edge environments where every KB matters
- High-throughput validation scenarios
- Micro-frontends where bundle size is critical

### Why Not Joi?

While Joi is mature and feature-rich, its bundle size (~45KB) and lack of tree-shaking make it unsuitable for a library that may be used in browser environments. The additional ~30KB provides marginal value over Zod for our use case.

### Why Not Yup?

Yup requires manual type definitions, which defeats the purpose of schema validation with TypeScript. The lack of automatic type inference is a deal-breaker for a configuration library where types must stay in sync with schemas.

## Implementation Plan

### Phase 1: Core Integration (Week 1)
1. Add Zod as a dependency
2. Create base schema definitions
3. Implement validation utilities
4. Add error formatting helpers

### Phase 2: Advanced Features (Week 2)
1. Implement transform pipelines
2. Add custom validators for config-specific needs
3. Create validation middleware
4. Add comprehensive test coverage

### Phase 3: Documentation (Week 3)
1. Document schema patterns
2. Create migration guide from other validators
3. Add examples for common use cases
4. Create troubleshooting guide

## Alternatives for Specific Use Cases

### Alternative 1: Valibot for Browser Builds
If bundle size becomes a critical concern, we can provide Valibot as an alternative:

```typescript
// validation/zod.ts
import { z } from 'zod';
export const { createSchema, validate } = setupZod();

// validation/valibot.ts
import * as v from 'valibot';
export const { createSchema, validate } = setupValibot();

// validation/index.ts
export { createSchema, validate } from './zod';
// Or: export { createSchema, validate } from './valibot';
```

### Alternative 2: JSON Schema
For environments that require JSON Schema (e.g., API documentation), we can use `zod-to-json-schema`:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

const jsonSchema = zodToJsonSchema(ConfigSchema, 'Config');
```

## Migration Path

If we need to migrate away from Zod in the future:

1. **Abstract the validation layer** - Create an internal interface that wraps Zod
2. **Version the schemas** - Include schema version in config files
3. **Gradual migration** - Support both old and new validation during transition

## References

1. [Zod Documentation](https://zod.dev)
2. [Joi Documentation](https://joi.dev)
3. [Yup Documentation](https://github.com/jquense/yup)
4. [Valibot Documentation](https://valibot.dev)
5. [Bundlephobia - Bundle Size Comparison](https://bundlephobia.com)
6. [npm trends - Download Statistics](https://npmtrends.com/zod-vs-joi-vs-yup-vs-valibot)

---

## Decision Log

| Date | Action | By | Notes |
|------|--------|-----|-------|
| 2026-04-02 | Proposed | Architecture Team | Initial proposal |
| 2026-04-02 | Review | Technical Lead | Pending review |

---

**Next Review Date**: 2026-07-02 (Quarterly review)
