# ADR-002: Configuration Source Strategy

## Status
**Proposed** → **Accepted** (pending review)

## Context

The phenotype-config-ts project must support multiple configuration sources to accommodate different deployment environments and use cases. This decision determines:

1. **Where configuration lives**: Files, environment variables, secret managers, or remote servers
2. **How configuration is loaded**: Synchronously vs asynchronously, cached vs real-time
3. **Configuration hierarchy**: Priority of sources when conflicts occur
4. **Security model**: How secrets are handled and protected
5. **Operational complexity**: Infrastructure requirements and maintenance burden

### Requirements

| Priority | Requirement | Description |
|----------|-------------|-------------|
| P0 | Multiple Sources | Support files, env vars, and secrets |
| P0 | Source Priority | Clear hierarchy for conflict resolution |
| P0 | Hot Reloading | Support for dynamic configuration updates |
| P1 | Secret Management | Secure handling of sensitive data |
| P1 | Type Safety | Full TypeScript type safety |
| P1 | Validation | Runtime validation of configuration |
| P2 | Remote Config | Support for centralized configuration servers |
| P2 | Caching | Efficient caching to reduce load on sources |
| P2 | Fallbacks | Graceful degradation when sources fail |

### Candidates

After evaluating the landscape, three primary architectural approaches were identified:

1. **File-First**: Configuration primarily from YAML/JSON/TOML files
2. **Hybrid (Recommended)**: Files + Environment Variables + Secrets Manager
3. **Remote-First**: Centralized configuration server

## Decision

**Chosen**: **Hybrid** approach combining local files, environment variables, and optional secret manager integration, with support for remote configuration servers as an extension.

## Consequences

### Positive

1. **Flexibility**: Supports diverse deployment scenarios (local dev, containers, Kubernetes, serverless)
2. **Security**: Secrets never stored in files or environment variables
3. **Portability**: Files can be version controlled; env vars adapt per environment
4. **Operational Simplicity**: No hard dependency on external services
5. **Performance**: Local files load quickly; caching reduces secret manager load
6. **Developer Experience**: Clear separation of concerns and easy local development

### Negative

1. **Complexity**: Multiple sources to manage and understand
2. **Consistency**: Risk of configuration drift between sources
3. **Debugging**: Harder to trace configuration origin with multiple sources
4. **Tooling**: Requires more sophisticated tooling than single-source approaches

### Neutral

1. **Learning curve** for developers understanding the hierarchy
2. **Vendor flexibility** - can work with any secret manager or config server
3. **Migration complexity** when moving between deployment models

## Detailed Comparison

### Option 1: File-First Architecture

```
Configuration Flow (File-First):

┌─────────────────────────────────────────────────────────────────┐
│  1. Load Default Config (config/default.yaml)                  │
│  2. Load Environment Config (config/{env}.yaml)                  │
│  3. Load Local Overrides (config/local.yaml - gitignored)     │
│  4. Validate Schema                                              │
│  5. Apply to Application                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation
```typescript
class FileFirstConfigManager {
  private config: any;
  
  async load(environment: string): Promise<void> {
    const files = [
      'config/default.yaml',
      `config/${environment}.yaml`,
      'config/local.yaml',  // Optional, gitignored
    ];
    
    let merged = {};
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        const parsed = YAML.parse(content);
        merged = deepMerge(merged, parsed);
      } catch {
        // File doesn't exist, skip
      }
    }
    
    this.config = ConfigSchema.parse(merged);
  }
  
  get<T>(path: string): T {
    return getByPath(this.config, path);
  }
}
```

#### Pros
- ✅ Simple mental model
- ✅ Version-controlled defaults
- ✅ Easy to read and understand
- ✅ Fast loading

#### Cons
- ❌ Secrets in files (security risk)
- ❌ Hard to change per environment without multiple files
- ❌ No dynamic updates
- ❌ Environment-specific values hardcoded

#### Best For
- Development environments
- Applications without strict secret requirements
- Simple deployment scenarios

### Option 2: Hybrid Architecture (Chosen)

```
Configuration Flow (Hybrid):

┌─────────────────────────────────────────────────────────────────┐
│  Priority 1: CLI Arguments (--port 8080)                       │
│       ↓                                                         │
│  Priority 2: Environment Variables (PORT=8080)                 │
│       ↓                                                         │
│  Priority 3: Secret Manager (Vault, AWS SM, etc.)              │
│       ↓                                                         │
│  Priority 4: Environment Config File (config/prod.yaml)        │
│       ↓                                                         │
│  Priority 5: Default Config File (config/default.yaml)         │
│       ↓                                                         │
│  Priority 6: Built-in Code Defaults                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation
```typescript
interface ConfigSource {
  name: string;
  priority: number;
  load(): Promise<Record<string, unknown>>;
  watch?(callback: () => void): void;
}

class HybridConfigManager {
  private sources: ConfigSource[] = [];
  private config: any;
  private schema: z.ZodTypeAny;
  
  constructor(schema: z.ZodTypeAny) {
    this.schema = schema;
    this.initializeSources();
  }
  
  private initializeSources(): void {
    this.sources = [
      // Priority 6: Built-in defaults (in schema)
      {
        name: 'defaults',
        priority: 6,
        load: async () => ({}),  // Schema provides defaults
      },
      
      // Priority 5: Default config file
      {
        name: 'default-file',
        priority: 5,
        load: () => this.loadFile('config/default.yaml'),
      },
      
      // Priority 4: Environment-specific file
      {
        name: 'env-file',
        priority: 4,
        load: () => this.loadFile(`config/${process.env.NODE_ENV}.yaml`),
      },
      
      // Priority 3: Secret manager
      {
        name: 'secrets',
        priority: 3,
        load: () => this.loadSecrets(),
      },
      
      // Priority 2: Environment variables
      {
        name: 'env',
        priority: 2,
        load: () => this.loadEnvironmentVariables(),
      },
      
      // Priority 1: CLI arguments
      {
        name: 'cli',
        priority: 1,
        load: () => this.loadCLIArguments(),
      },
    ].sort((a, b) => a.priority - b.priority);
  }
  
  async load(): Promise<void> {
    let merged = {};
    
    // Load from lowest priority to highest
    for (const source of this.sources) {
      try {
        const data = await source.load();
        if (data) {
          merged = deepMerge(merged, data);
        }
      } catch (error) {
        console.warn(`Failed to load source ${source.name}:`, error);
      }
    }
    
    this.config = this.schema.parse(merged);
  }
  
  private async loadFile(path: string): Promise<Record<string, unknown> | null> {
    try {
      const content = await readFile(path, 'utf-8');
      return YAML.parse(content);
    } catch {
      return null;
    }
  }
  
  private loadEnvironmentVariables(): Record<string, unknown> {
    const transformer = new EnvVarTransformer({ prefix: 'PH_' });
    const config: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (!key) continue;
      const path = transformer.transform(key);
      if (path) {
        setByPath(config, path, parseEnvValue(value || ''));
      }
    }
    
    return config;
  }
  
  private async loadSecrets(): Promise<Record<string, unknown>> {
    const provider = createSecretProvider();
    return await provider.loadConfig();
  }
  
  private loadCLIArguments(): Record<string, unknown> {
    // Parse CLI args and convert to config object
    return parseCLIToConfig();
  }
  
  get<T>(path: string): T {
    return getByPath(this.config, path);
  }
  
  async watch(callback: (change: ConfigChange) => void): Promise<void> {
    // Watch file sources for changes
    for (const source of this.sources) {
      if (source.watch) {
        source.watch(async () => {
          const previous = this.config;
          await this.load();
          callback({
            previous,
            current: this.config,
            source: source.name,
          });
        });
      }
    }
  }
}

// Environment variable transformation
class EnvVarTransformer {
  constructor(private options: { prefix?: string; separator?: string } = {}) {
    this.options.prefix = options.prefix || '';
    this.options.separator = options.separator || '__';
  }
  
  // PH_DATABASE__HOST → database.host
  transform(key: string): string | null {
    if (this.options.prefix && !key.startsWith(this.options.prefix)) {
      return null;
    }
    
    const withoutPrefix = this.options.prefix
      ? key.slice(this.options.prefix.length)
      : key;
    
    return withoutPrefix
      .toLowerCase()
      .split(this.options.separator)
      .join('.');
  }
}

// Parse environment values intelligently
function parseEnvValue(value: string): unknown {
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
```

#### Pros
- ✅ Flexible deployment options
- ✅ Secrets properly secured
- ✅ Environment-specific overrides
- ✅ Version-controlled defaults
- ✅ Dynamic updates (with file watching)
- ✅ Clear priority model
- ✅ Works without external dependencies

#### Cons
- ⚠️ More complex than single-source
- ⚠️ Multiple places to check for configuration
- ⚠️ Requires understanding of hierarchy
- ⚠️ More code to maintain

#### Best For
- Production applications
- Containerized deployments
- Applications with secrets
- Teams with diverse deployment needs

### Option 3: Remote-First Architecture

```
Configuration Flow (Remote-First):

┌─────────────────────────────────────────────────────────────────┐
│  1. Connect to Config Server (Spring Cloud Config, Consul,     │
│     etcd, LaunchDarkly, etc.)                                   │
│  2. Authenticate and fetch configuration                       │
│  3. Cache locally (with TTL)                                   │
│  4. Subscribe to changes (WebSocket/SSE/long-polling)        │
│  5. Validate schema                                             │
│  6. Apply to Application                                       │
│  7. Periodically refresh cache                                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation
```typescript
class RemoteFirstConfigManager {
  private config: any;
  private cache: Map<string, any> = new Map();
  private schema: z.ZodTypeAny;
  private client: ConfigServerClient;
  
  constructor(
    schema: z.ZodTypeAny,
    private options: {
      serverUrl: string;
      application: string;
      profile: string;
      label?: string;
      refreshInterval?: number;
    }
  ) {
    this.schema = schema;
    this.client = new ConfigServerClient({
      url: options.serverUrl,
      application: options.application,
      profile: options.profile,
      label: options.label,
    });
  }
  
  async load(): Promise<void> {
    // Try cache first
    const cached = this.cache.get('config');
    if (cached && !this.isStale(cached)) {
      this.config = cached;
      return;
    }
    
    // Fetch from remote
    const remoteConfig = await this.client.fetch();
    
    // Merge with local fallback
    const localFallback = await this.loadLocalFallback();
    const merged = deepMerge(localFallback, remoteConfig);
    
    // Validate
    this.config = this.schema.parse(merged);
    
    // Update cache
    this.cache.set('config', {
      data: this.config,
      timestamp: Date.now(),
    });
  }
  
  async watch(): Promise<void> {
    // Subscribe to real-time updates
    this.client.subscribe((updatedConfig) => {
      const merged = deepMerge(this.config, updatedConfig);
      this.config = this.schema.parse(merged);
      this.emit('change', this.config);
    });
    
    // Periodic refresh as fallback
    setInterval(() => this.load(), this.options.refreshInterval || 60000);
  }
  
  private async loadLocalFallback(): Promise<Record<string, unknown>> {
    // Load from local files as fallback
    try {
      const content = await readFile('config/fallback.yaml', 'utf-8');
      return YAML.parse(content);
    } catch {
      return {};
    }
  }
  
  private isStale(cached: { timestamp: number }): boolean {
    const ttl = this.options.refreshInterval || 60000;
    return Date.now() - cached.timestamp > ttl;
  }
  
  get<T>(path: string): T {
    return getByPath(this.config, path);
  }
}

// Config Server Client interface
interface ConfigServerClient {
  fetch(): Promise<Record<string, unknown>>;
  subscribe(callback: (config: Record<string, unknown>) => void): void;
}
```

#### Pros
- ✅ Centralized configuration management
- ✅ Real-time updates across all instances
- ✅ Audit trail and versioning
- ✅ Dynamic configuration without restarts
- ✅ Consistency across environments

#### Cons
- ❌ Hard dependency on external service
- ❌ Network latency on startup
- ❌ Single point of failure
- ❌ More complex infrastructure
- ❌ Additional operational burden

#### Best For
- Large-scale distributed systems
- Organizations with dedicated platform teams
- Applications requiring real-time configuration updates
- Multi-region deployments

## Decision Rationale

### Why Hybrid?

1. **Deployment Flexibility**
   - Works in any environment: local dev, Docker, Kubernetes, serverless
   - No hard dependency on external services
   - Gradual adoption path

2. **Security Model**
   - Secrets properly isolated in secret managers
   - No risk of secrets in version control
   - Environment variables for non-sensitive config
   - Files for structured configuration

3. **Operational Simplicity**
   - Can run entirely locally for development
   - Clear fallback chain if sources fail
   - Easy to debug and understand
   - No single point of failure

4. **Industry Alignment**
   - Follows 12-Factor App configuration principles
   - Matches patterns used by Spring Boot, Rails, Django
   - Well-understood by DevOps teams

5. **Extensibility**
   - Easy to add remote configuration as an additional source
   - Can integrate with any secret manager
   - Plugin architecture for custom sources

### Source Priority Rationale

```
Priority 1: CLI Arguments
- Most specific, used for temporary overrides
- Example: --port 8080 for debugging

Priority 2: Environment Variables
- Container-native configuration method
- Platform-agnostic (works everywhere)
- 12-Factor App recommended approach

Priority 3: Secret Manager
- Secure storage for sensitive data
- Runtime resolution (not in files/env)
- Automatic rotation support

Priority 4: Environment-Specific Files
- Structured configuration for environment
- Can include non-sensitive defaults
- Version-controlled per-environment configs

Priority 5: Default Files
- Base configuration for all environments
- Version-controlled, documented
- Sensible defaults

Priority 6: Code Defaults
- Fallback when all else fails
- In schema definition
- Ensures application can start
```

## Implementation Strategy

### Phase 1: Core File + Environment Support (Week 1)
```typescript
// Basic implementation
const config = await new ConfigManager({
  schema: ConfigSchema,
  sources: [
    { type: 'file', path: 'config/default.yaml' },
    { type: 'env', prefix: 'PH_' },
  ],
}).load();
```

### Phase 2: Secret Manager Integration (Week 2)
```typescript
const config = await new ConfigManager({
  schema: ConfigSchema,
  sources: [
    { type: 'file', path: 'config/default.yaml' },
    { type: 'vault', path: 'secret/phenotype', mount: 'secret' },
    { type: 'env', prefix: 'PH_' },
  ],
}).load();
```

### Phase 3: Hot Reloading (Week 3)
```typescript
const manager = new ConfigManager({
  schema: ConfigSchema,
  sources: [
    { type: 'file', path: 'config/default.yaml', watch: true },
    { type: 'env', prefix: 'PH_' },
  ],
});

manager.on('change', (event) => {
  console.log(`Config changed: ${event.path} = ${event.value}`);
});
```

### Phase 4: Remote Configuration (Future)
```typescript
const manager = new ConfigManager({
  schema: ConfigSchema,
  sources: [
    { type: 'remote', url: 'https://config.example.com', refresh: 60000 },
    { type: 'file', path: 'config/default.yaml' },
    { type: 'env', prefix: 'PH_' },
  ],
});
```

## Configuration Source Specifications

### File Source
```typescript
interface FileSourceConfig {
  type: 'file';
  path: string;
  format?: 'yaml' | 'json' | 'toml';
  watch?: boolean;
  required?: boolean;
}
```

### Environment Source
```typescript
interface EnvSourceConfig {
  type: 'env';
  prefix?: string;
  separator?: string;
  parseValues?: boolean;
}
```

### Secret Manager Sources

#### HashiCorp Vault
```typescript
interface VaultSourceConfig {
  type: 'vault';
  endpoint: string;
  path: string;
  mount?: string;
  auth: {
    method: 'token' | 'approle' | 'kubernetes';
    credentials: Record<string, string>;
  };
  cacheTtl?: number;
}
```

#### AWS Secrets Manager
```typescript
interface AWSSMSourceConfig {
  type: 'aws-sm';
  region: string;
  secretId: string;
  versionId?: string;
  cacheTtl?: number;
}
```

#### Azure Key Vault
```typescript
interface AzureKVSourceConfig {
  type: 'azure-kv';
  vaultUrl: string;
  secretName?: string;
  cacheTtl?: number;
}
```

### Remote Sources

#### Spring Cloud Config
```typescript
interface SpringCloudConfig {
  type: 'spring-cloud';
  url: string;
  application: string;
  profile: string;
  label?: string;
  refreshInterval?: number;
}
```

#### Consul
```typescript
interface ConsulConfig {
  type: 'consul';
  host: string;
  port: number;
  prefix: string;
  token?: string;
  watch?: boolean;
}
```

## Migration Path

### From File-First to Hybrid
1. Add environment variable support
2. Introduce secret manager for sensitive values
3. Document the hierarchy
4. Gradually move secrets out of files

### From Remote-First to Hybrid
1. Add local file sources as fallbacks
2. Implement caching layer
3. Add offline mode support
4. Document disaster recovery procedures

## Operational Considerations

### Local Development
```bash
# .env file (gitignored)
PH_DATABASE__URL=postgres://localhost:5432/dev
PH_SERVER__PORT=3000
PH_DEBUG=true

# config/default.yaml
server:
  host: "0.0.0.0"
  
database:
  poolSize: 10
```

### Docker/Container
```dockerfile
# Dockerfile
COPY config/default.yaml /app/config/
ENV PH_NODE_ENV=production
ENV VAULT_ADDR=https://vault.example.com
```

```yaml
# docker-compose.yml
version: '3'
services:
  app:
    build: .
    environment:
      - PH_DATABASE__URL=postgres://db:5432/app
      - PH_SERVER__PORT=8080
      - VAULT_TOKEN=${VAULT_TOKEN}
```

### Kubernetes
```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  default.yaml: |
    server:
      host: "0.0.0.0"
      port: 8080
    
    database:
      poolSize: 20
---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  database-url: "postgres://prod-db:5432/app"
```

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: PH_DATABASE__URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          volumeMounts:
            - name: config
              mountPath: /app/config
      volumes:
        - name: config
          configMap:
            name: app-config
```

## References

1. [The Twelve-Factor App: Config](https://12factor.net/config)
2. [Spring Cloud Config Documentation](https://cloud.spring.io/spring-cloud-config/reference/html/)
3. [Consul Documentation](https://www.consul.io/docs)
4. [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
5. [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
6. [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)

---

## Decision Log

| Date | Action | By | Notes |
|------|--------|-----|-------|
| 2026-04-02 | Proposed | Architecture Team | Initial proposal |
| 2026-04-02 | Review | Technical Lead | Pending review |

---

**Next Review Date**: 2026-07-02 (Quarterly review)
