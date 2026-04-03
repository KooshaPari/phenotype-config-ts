# Feature Flags Systems - State of the Art (SOTA)

> Comprehensive research on feature flag systems, their architectures, and implementation patterns for modern applications.

**Research Date**: 2026-04-02  
**Document Version**: 1.0  
**Author**: Phenotype Research Team  
**Status**: Active Research

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [LaunchDarkly](#2-launchdarkly)
3. [Unleash](#3-unleash)
4. [Flagsmith](#4-flagsmith)
5. [Split.io](#5-splitio)
6. [Custom Implementation Patterns](#6-custom-implementation-patterns)
7. [Feature Flag Architecture](#7-feature-flag-architecture)
8. [Best Practices](#8-best-practices)
9. [References](#9-references)

---

## 1. Executive Summary

Feature flags (also known as feature toggles or feature switches) are a powerful technique that allows teams to modify system behavior without changing code. They enable:

- **Continuous Deployment**: Deploy code to production before it's ready
- **Gradual Rollouts**: Release features to subsets of users
- **A/B Testing**: Compare different feature variants
- **Kill Switches**: Disable problematic features instantly
- **Experimentation**: Test hypotheses with real users

### Key Findings

| System | Type | Best For | Pricing Model |
|--------|------|----------|---------------|
| **LaunchDarkly** | SaaS | Enterprise, scale | Per-seat + MAU |
| **Unleash** | OSS + SaaS | Self-hosted, control | Open source free |
| **Flagsmith** | OSS + SaaS | Startups, mid-size | Generous free tier |
| **Split.io** | SaaS | Data-driven teams | Per-seat + events |
| **Custom** | In-house | Simple use cases | Infrastructure only |

---

## 2. LaunchDarkly

### 2.1 Overview

LaunchDarkly is the market-leading feature flag platform, providing enterprise-grade capabilities with high availability and advanced targeting.

**Website**: launchdarkly.com  
**Founded**: 2014  
**Customers**: Microsoft, Atlassian, SAP, Square

### 2.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LaunchDarkly Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Control    │────▶│   Feature    │◀────│   Metrics    │   │
│  │    Plane     │     │    Store     │     │   Store      │   │
│  │  (Flag Mgmt) │     │ (Real-time)  │     │ (Analytics)  │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                    │                                   │
│         │                    │                                   │
│         ▼                    ▼                                   │
│  ┌─────────────────────────────────────────┐                  │
│  │         Streaming/Event System          │                  │
│  │    (SSE/WebSockets for real-time)      │                  │
│  └─────────────────────────────────────────┘                  │
│                         │                                      │
│         ┌───────────────┼───────────────┐                      │
│         ▼               ▼               ▼                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │ SDK (JS) │    │ SDK (Go) │    │ SDK (TS) │                 │
│  │  (Local  │    │  (Local  │    │  (Local  │                 │
│  │   Cache) │    │   Cache) │    │   Cache) │                 │
│  └──────────┘    └──────────┘    └──────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 TypeScript SDK Implementation

```typescript
import { init, LDClient, LDContext } from 'launchdarkly-node-server-sdk';

// Initialize client
const client: LDClient = init(process.env.LD_SDK_KEY!, {
  // Configuration options
  stream: true,              // Real-time updates via SSE
  offline: false,            // Don't fallback to defaults
  sendEvents: true,          // Analytics events
  allAttributesPrivate: false,
  privateAttributes: ['email', 'ssn'],
  
  // Polling fallback (if streaming fails)
  pollInterval: 30,
  
  // Connection timeout
  timeout: 5,
});

// Wait for initialization
await client.waitForInitialization();

// Create user context
const context: LDContext = {
  kind: 'user',
  key: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  attributes: {
    plan: 'enterprise',
    signupDate: '2024-01-15',
    country: 'US',
    role: 'admin',
  },
};

// Boolean flag
const newFeature = await client.boolVariation('new-dashboard', context, false);
if (newFeature) {
  showNewDashboard();
} else {
  showOldDashboard();
}

// String variation (A/B test)
const buttonColor = await client.stringVariation('checkout-button-color', context, 'blue');
renderButton({ color: buttonColor });

// Number variation (progressive rollout percentage)
const rolloutPercentage = await client.numberVariation('feature-rollout', context, 0);

// JSON variation (complex configuration)
const featureConfig = await client.jsonVariation('payment-gateway-config', context, {
  provider: 'stripe',
  timeout: 5000,
});

// Multi-context (user + device + organization)
const multiContext: LDContext = {
  kind: 'multi',
  user: {
    key: 'user-123',
    name: 'John Doe',
  },
  device: {
    key: 'device-456',
    os: 'iOS',
    version: '17.0',
  },
  organization: {
    key: 'org-789',
    plan: 'enterprise',
  },
};
```

### 2.4 Advanced Targeting

```typescript
// Rule-based targeting in LaunchDarkly dashboard
// Rules are defined in UI, evaluated server-side

// Example: Target users in specific segments
const segments = await client.allFlagsState(context);
const allFlags = segments.allValues();

// Custom attributes for targeting
const advancedContext: LDContext = {
  kind: 'user',
  key: 'user-123',
  attributes: {
    // Built-in attributes
    name: 'John Doe',
    email: 'john@example.com',
    
    // Custom targeting attributes
    betaTester: true,
    cohort: '2024-q1',
    featureUsage: {
      apiCallsLastMonth: 1500,
      storageUsed: '10GB',
    },
    computed: {
      riskScore: 0.23,
      lifetimeValue: 5000,
    },
  },
};

// Prerequisite flags
// Flag B only evaluates to true if Flag A is true
const prerequisiteFlag = await client.boolVariation('beta-access', context, false);
if (prerequisiteFlag) {
  const betaFeature = await client.boolVariation('beta-feature', context, false);
}

// Experiment tracking
client.track('conversion', context, null, 99.99);
client.track('page-view', context, { page: 'checkout' });

// Aliasing (anonymous to identified user)
client.alias({ kind: 'user', key: 'anon-123' }, { kind: 'user', key: 'user-123' });
```

### 2.5 Offline Mode and Testing

```typescript
import { LDClient, LDOptions } from 'launchdarkly-node-server-sdk';

// Test configuration with file data source
const testOptions: LDOptions = {
  updateProcessor: {
    factory: () => {
      return {
        start: (callback: (data: any) => void) => {
          // Return test flag data
          callback({
            flags: {
              'test-flag': {
                key: 'test-flag',
                on: true,
                fallthrough: { variation: 0 },
                variations: [true, false],
              },
            },
          });
        },
        stop: () => {},
      };
    },
  },
};

const testClient: LDClient = init('fake-key', testOptions);

// Or use file data source for local development
import { FileDataSourceFactory } from 'launchdarkly-node-server-sdk/integrations';

const devOptions: LDOptions = {
  updateProcessor: FileDataSourceFactory({
    paths: ['./local-flags.json'],
    autoUpdate: true,
  }),
};
```

### 2.6 Pricing and Plans

| Plan | Price | Features |
|------|-------|----------|
| **Starter** | $8.33/seat/mo | 2 environments, 1k MAU |
| **Pro** | $16.67/seat/mo | Unlimited environments, 10k MAU |
| **Enterprise** | Custom | Unlimited, SSO, advanced security |

### 2.7 Pros and Cons

**Pros:**
- Most mature platform in the market
- Excellent SDK coverage (30+ languages)
- Advanced experimentation capabilities
- Strong enterprise security features
- 99.999% SLA
- Real-time streaming updates

**Cons:**
- Expensive for large user bases
- Complex pricing model
- Can be overkill for simple use cases
- Vendor lock-in

---

## 3. Unleash

### 3.1 Overview

Unleash is the leading open-source feature flag solution, offering both self-hosted and managed cloud options.

**Website**: getunleash.io  
**License**: Apache 2.0  
**GitHub**: github.com/Unleash/unleash  
**Stars**: 10k+

### 3.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Unleash Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Unleash API    │◀────────│   Admin UI       │             │
│  │   (Node.js)      │         │   (React)        │             │
│  └────────┬─────────┘         └──────────────────┘             │
│           │                                                     │
│           │ API / DB                                            │
│           ▼                                                     │
│  ┌──────────────────┐                                           │
│  │   PostgreSQL     │                                           │
│  │   (State Store)  │                                           │
│  └────────┬─────────┘                                           │
│           │                                                     │
│           │ Client SDKs fetch /cache                            │
│     ┌─────┴─────┬─────────┬─────────┐                          │
│     ▼           ▼         ▼         ▼                          │
│ ┌──────┐   ┌──────┐  ┌──────┐  ┌──────┐                       │
│ │ SDK  │   │ SDK  │  │ SDK  │  │ SDK  │                       │
│ │Node  │   │ Go   │  │Ruby  │  │ Rust │                       │
│ │      │   │      │  │      │  │      │                       │
│ │Local │   │Local │  │Local │  │Local │                       │
│ │Cache │   │Cache │  │Cache │  │Cache │                       │
│ └──────┘   └──────┘  └──────┘  └──────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 TypeScript SDK Implementation

```typescript
import { startUnleash, Unleash } from 'unleash-client';

// Initialize client
const unleash: Unleash = await startUnleash({
  url: 'http://unleash.example.com/api',
  appName: 'my-application',
  instanceId: 'instance-1',
  
  // Authentication
  customHeaders: {
    Authorization: process.env.UNLEASH_API_TOKEN!,
  },
  
  // Refresh interval
  refreshInterval: 15000,  // 15 seconds
  
  // Metrics
  metricsInterval: 60000,  // 1 minute
  
  // Bootstrap (start with cached data)
  bootstrap: {
    url: 'file:///path/to/bootstrap.json',
  },
  
  // Fallback
  fallback: {
    'new-feature': false,
    'experimental-api': false,
  },
});

// Basic toggle check
const isEnabled = unleash.isEnabled('new-feature');
if (isEnabled) {
  // Feature is enabled
}

// With context
const isEnabledForUser = unleash.isEnabled('beta-feature', {
  userId: 'user-123',
  sessionId: 'session-456',
  remoteAddress: '192.168.1.1',
  environment: 'production',
  appName: 'my-app',
  properties: {
    customerId: 'customer-789',
    plan: 'enterprise',
    betaTester: true,
  },
});

// Variant (A/B testing with multiple variants)
const variant = unleash.getVariant('checkout-button', {
  userId: 'user-123',
});

console.log(variant.name);  // 'blue', 'green', or 'control'
console.log(variant.enabled);  // true if user was assigned a variant
console.log(variant.payload);  // Optional data: { color: '#0000FF' }

// Using variant
if (variant.name === 'blue') {
  renderBlueButton();
} else if (variant.name === 'green') {
  renderGreenButton();
}
```

### 3.4 Activation Strategies

```typescript
import { Strategy } from 'unleash-client';

// Custom strategy implementation
class GradualRolloutRandomStrategy implements Strategy {
  name = 'gradualRolloutRandom';
  
  isEnabled(parameters: { percentage?: string }): boolean {
    const percentage = parseInt(parameters.percentage || '0', 10);
    return Math.random() * 100 < percentage;
  }
}

class GradualRolloutUserIdStrategy implements Strategy {
  name = 'gradualRolloutUserId';
  
  isEnabled(
    parameters: { percentage?: string; groupId?: string },
    context: { userId?: string }
  ): boolean {
    const percentage = parseInt(parameters.percentage || '0', 10);
    const userId = context.userId || '';
    
    // Deterministic hashing
    const hash = this.hash(`${parameters.groupId}:${userId}`);
    return hash % 100 < percentage;
  }
  
  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;  // Convert to 32-bit
    }
    return Math.abs(hash);
  }
}

// Register custom strategies
const unleash = await startUnleash({
  url: 'http://unleash.example.com/api',
  appName: 'my-app',
  strategies: [
    new GradualRolloutRandomStrategy(),
    new GradualRolloutUserIdStrategy(),
  ],
});
```

### 3.5 Self-Hosted Deployment

```yaml
# docker-compose.yml for self-hosted Unleash
version: '3.8'

services:
  unleash:
    image: unleashorg/unleash-server:latest
    ports:
      - "4242:4242"
    environment:
      DATABASE_URL: postgres://unleash:pass@db/unleash
      DATABASE_SSL: "false"
      INIT_FRONTEND_API_TOKENS: default:development.unleash-insecure-frontend-api-token
      INIT_CLIENT_API_TOKENS: default:development.unleash-insecure-api-token
    depends_on:
      - db
    healthcheck:
      test: wget --no-verbose --tries=1 --spider http://localhost:4242/health || exit 1
      interval: 1s
      timeout: 1m
      retries: 5
      start_period: 15s

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: unleash
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: unleash
    volumes:
      - unleash-db:/var/lib/postgresql/data
    healthcheck:
      test: pg_isready -U unleash -d unleash
      interval: 2s
      timeout: 20s
      retries: 10

volumes:
  unleash-db:
```

### 3.6 Pricing and Plans

| Plan | Price | Features |
|------|-------|----------|
| **Open Source** | Free | Self-hosted, full features |
| **Pro** | $80/mo | Cloud, 5 projects, email support |
| **Enterprise** | Custom | Cloud/self-hosted, SSO, advanced |

### 3.7 Pros and Cons

**Pros:**
- Fully open source (Apache 2.0)
- Can self-host (data sovereignty)
- Active community
- Good SDK coverage
- Simple architecture
- No per-user pricing

**Cons:**
- Self-hosted requires maintenance
- Smaller ecosystem than LaunchDarkly
- Less advanced experimentation features
- Community support for OSS

---

## 4. Flagsmith

### 4.1 Overview

Flagsmith is a feature flag and remote config service with a generous free tier and excellent developer experience.

**Website**: flagsmith.com  
**License**: BSD-3-Clause  
**GitHub**: github.com/Flagsmith/flagsmith  
**Stars**: 4k+

### 4.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Flagsmith Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Flagsmith API  │◀────────│   Dashboard      │             │
│  │   (Python/Django)│         │   (React)        │             │
│  └────────┬─────────┘         └──────────────────┘             │
│           │                                                     │
│           │ API / Postgres                                      │
│           ▼                                                     │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   PostgreSQL     │         │   InfluxDB       │             │
│  │   (Primary DB)   │         │   (Analytics)    │             │
│  └────────┬─────────┘         └──────────────────┘             │
│           │                                                     │
│     ┌─────┴─────┬─────────┬─────────┐                          │
│     ▼           ▼         ▼         ▼                          │
│ ┌──────┐   ┌──────┐  ┌──────┐  ┌──────┐                       │
│ │Node  │   │ JS   │  │ Go   │  │ .NET │                       │
│ │ SDK  │   │ SDK  │  │ SDK  │  │ SDK  │                       │
│ │      │   │      │  │      │  │      │                       │
│ │Local │   │Local │  │Local │  │Local │                       │
│ │Cache │   │Cache │  │Cache │  │Cache │                       │
│ └──────┘   └──────┘  └──────┘  └──────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 TypeScript SDK Implementation

```typescript
import Flagsmith from 'flagsmith-nodejs';

// Initialize
const flagsmith = new Flagsmith({
  environmentKey: process.env.FLAGSMITH_ENVIRONMENT_KEY!,
  apiUrl: 'https://api.flagsmith.com/api/v1/',
  
  // Caching
  cacheFlags: true,
  cacheExpirySeconds: 60,
  
  // Analytics
  enableAnalytics: true,
  
  // Default flags (if API unavailable)
  defaultFlagHandler: (flagKey) => {
    return {
      enabled: false,
      value: null,
      isDefault: true,
    };
  },
  
  // Logging
  requestTimeoutSeconds: 10,
  retries: 3,
});

// Get all flags for user
const flags = await flagsmith.getEnvironmentFlags();
const isEnabled = flags.isFeatureEnabled('new_feature');

// With user context (identities)
const userFlags = await flagsmith.getIdentityFlags('user-123', {
  plan: 'enterprise',
  region: 'us-east-1',
  signup_date: '2024-01-15',
});

const featureEnabled = await userFlags.isFeatureEnabled('beta_feature');
const configValue = await userFlags.getFeatureValue('api_timeout');

// Remote config (without boolean)
const themeColor = await userFlags.getFeatureValue('theme_color');
const maxRetries = parseInt(await userFlags.getFeatureValue('max_retries') || '3', 10);

// Using segments
const isInSegment = await flagsmith.getIdentitySegments('user-123', {
  plan: 'enterprise',
});
console.log(isInSegment.map(s => s.name));  // ['Beta Users', 'Enterprise Plan']
```

### 4.4 Segments and Targeting

```typescript
// Define segments in Flagsmith dashboard
// Segment: Beta Users
// Rule: signup_date > 2024-01-01 AND beta_opt_in = true

// Segment: Enterprise Plan
// Rule: plan = 'enterprise'

// Feature flag with segment override
// Feature: new_api_v2
// Default: false
// Override 1: Enable for Beta Users (100%)
// Override 2: Enable for Enterprise Plan (50%)

// SDK automatically evaluates segments based on identity traits
const flags = await flagsmith.getIdentityFlags('user-123', {
  signup_date: '2024-02-15',
  beta_opt_in: true,
  plan: 'enterprise',
});

// This user gets the feature because they're in Beta Users segment
const newApiV2 = await flags.isFeatureEnabled('new_api_v2');
```

### 4.5 Multi-Variate Flags

```typescript
// Multi-variate flag for A/B testing
// Feature: checkout_button_style
// Variants:
//   - control (50%): { color: 'blue', size: 'medium' }
//   - variant_a (25%): { color: 'green', size: 'large' }
//   - variant_b (25%): { color: 'red', size: 'small' }

const flags = await flagsmith.getIdentityFlags('user-123');
const buttonConfig = await flags.getFeatureValue('checkout_button_style');

// Parse JSON value
const config = JSON.parse(buttonConfig || '{}');
renderButton(config);

// Track conversion for experiment analysis
await flagsmith.trackEvent('purchase_completed', 'user-123', {
  value: 99.99,
});
```

### 4.6 Self-Hosted with Docker

```yaml
# docker-compose.yml
version: '3'

services:
  flagsmith:
    image: flagsmith/flagsmith:latest
    ports:
      - "8000:8000"
    environment:
      DJANGO_ALLOWED_HOSTS: '*'
      DATABASE_URL: postgres://flagsmith:password@db:5432/flagsmith
      SECRET_KEY: local-secret-key-change-in-production
      ENABLE_INFLUXDB_FEATURES: 'false'
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: flagsmith
      POSTGRES_PASSWORD: password
      POSTGRES_DB: flagsmith
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 4.7 Pricing and Plans

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 1 project, 2 environments, 50k requests/mo |
| **Startup** | $45/mo | 3 projects, unlimited environments |
| **Scale-Up** | $200/mo | 10 projects, SSO, priority support |
| **Enterprise** | Custom | Unlimited, dedicated support |

### 4.8 Pros and Cons

**Pros:**
- Generous free tier
- Open source (BSD-3-Clause)
- Simple, intuitive UI
- Good remote config support
- Built-in A/B testing
- Easy self-hosting

**Cons:**
- Smaller SDK ecosystem
- Less mature than LaunchDarkly/Unleash
- Fewer enterprise features
- Limited integrations

---

## 5. Split.io

### 5.1 Overview

Split.io focuses on data-driven feature releases with robust experimentation and event tracking capabilities.

**Website**: split.io  
**Founded**: 2015  
**Differentiation**: Data-driven experimentation

### 5.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Split.io Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │                    Split Cloud                         │     │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │     │
│  │  │  Admin API   │ │  Event API   │ │  Metrics API │   │     │
│  │  └──────────────┘ └──────────────┘ └──────────────┘   │     │
│  └────────┬────────────────┬───────────────┬──────────────┘     │
│           │                │               │                    │
│     ┌─────┴─────┐    ┌────┴─────┐    ┌────┴─────┐             │
│     ▼           ▼    ▼          ▼    ▼          ▼             │
│ ┌──────┐   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ SDK  │   │ SDK  │ │ SDK  │ │ SDK  │ │ SDK  │ │ SDK  │     │
│ │Node  │   │ Java │ │ Go   │ │ Ruby │ │Python│ │.NET  │     │
│ │      │   │      │ │      │ │      │ │      │ │      │     │
│ │Local │   │Local │ │Local │ │Local │ │Local │ │Local │     │
│ │Cache │   │Cache │ │Cache │ │Cache │ │Cache │ │Cache │     │
│ └──────┘   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 TypeScript SDK Implementation

```typescript
import { SplitFactory } from '@splitsoftware/splitio';

// Initialize SDK
const factory = SplitFactory({
  core: {
    authorizationKey: process.env.SPLIT_API_KEY!,
    key: 'user-123',  // Default user key
    trafficType: 'user',
  },
  
  // Storage
  storage: {
    type: 'MEMORY',
    prefix: 'SPLITIO',
  },
  
  // Synchronization
  scheduler: {
    featuresRefreshRate: 30,     // 30 seconds
    segmentsRefreshRate: 60,     // 60 seconds
    metricsRefreshRate: 120,     // 120 seconds
    impressionsRefreshRate: 60,  // 60 seconds
    eventsPushRate: 60,          // 60 seconds
  },
  
  // Startup
  startup: {
    readyTimeout: 15,  // seconds
    requestTimeoutBeforeReady: 5,
    retriesOnFailureBeforeReady: 1,
  },
  
  // Logging
  debug: process.env.NODE_ENV === 'development',
  
  // Impression listener for analytics
  impressionListener: {
    logImpression: (impressionData) => {
      console.log('Impression:', impressionData);
    },
  },
});

const client = factory.client();

// Wait for ready
await new Promise((resolve, reject) => {
  client.on(client.Event.SDK_READY, resolve);
  client.on(client.Event.SDK_READY_TIMED_OUT, reject);
});

// Basic treatment (string flag value)
const treatment = client.getTreatment('new_feature');

if (treatment === 'on') {
  // Feature enabled
} else if (treatment === 'off') {
  // Feature disabled
} else {
  // Control (SDK not ready or error)
}

// With attributes
const treatmentWithAttributes = client.getTreatment('checkout_flow', {
  plan: 'premium',
  signup_date: Date.now(),
  age: 25,
  // Custom attributes
  customer_tier: 'gold',
});

// Treatments (bulk evaluation)
const treatments = client.getTreatments([
  'feature_a',
  'feature_b',
  'feature_c',
]);

// Track events for experiments
client.track('user-123', 'purchase', 99.99, {
  product: 'widget',
  category: 'electronics',
});

// Track custom events
client.track('user-123', 'page_view', undefined, {
  page: '/checkout',
  referrer: 'google',
});
```

### 5.4 Advanced Targeting

```typescript
// Attribute-based targeting
const attributes = {
  // Built-in attributes
  plan: 'enterprise',
  created: new Date('2024-01-01').getTime(),
  
  // Custom attributes for targeting rules
  region: 'us-west',
  device: 'mobile',
  version: '2.5.0',
  cohort: 'experiment-1',
  
  // List attributes
  permissions: ['read', 'write', 'admin'],
  
  // Numeric attributes for comparison
  purchase_count: 5,
  lifetime_value: 500,
};

const treatment = client.getTreatment('personalized_homepage', attributes);

// Rule in Split dashboard:
// IF plan = 'enterprise' AND lifetime_value >= 500
// THEN treatment: 'premium_experience'
// ELSE IF cohort = 'experiment-1'
// THEN treatment: 'experiment_variant'
// ELSE treatment: 'control'

// Multi-key evaluation (different keys per feature)
const splitClient = factory.client();
const result = splitClient.getTreatmentsWithConfig('user-123', [
  'feature_1',
  'feature_2',
], attributes);
```

### 5.5 Configuration (Feature Flags as Config)

```typescript
// Get treatment with configuration
const treatmentWithConfig = client.getTreatmentWithConfig('api_timeout_config');

// treatmentWithConfig = {
//   treatment: 'high_performance',
//   config: '{"timeout": 5000, "retries": 3}'
// }

if (treatmentWithConfig.config) {
  const config = JSON.parse(treatmentWithConfig.config);
  apiClient.setTimeout(config.timeout);
  apiClient.setRetries(config.retries);
}

// Manager for inspecting splits
const manager = factory.manager();
const splitNames = manager.names();  // ['new_feature', 'checkout_flow']
const splitView = manager.split('new_feature');

console.log(splitView);
// {
//   name: 'new_feature',
//   trafficType: 'user',
//   killed: false,
//   treatments: ['on', 'off'],
//   changeNumber: 12345,
//   configs: {
//     on: '{"color": "blue"}',
//     off: null
//   }
// }
```

### 5.6 Local Mode for Testing

```typescript
// Local-only mode for testing
const factory = SplitFactory({
  core: {
    authorizationKey: 'localhost',  // Special key for local mode
  },
  features: {
    // Define treatments locally
    'test_feature_1': 'on',
    'test_feature_2': {
      treatment: 'variant_a',
      config: '{"color": "blue"}',
    },
    'test_feature_3': 'off',
  },
  storage: {
    type: 'MEMORY',
  },
});

// Or load from file
import { readFileSync } from 'fs';

const factory = SplitFactory({
  core: {
    authorizationKey: 'localhost',
  },
  features: JSON.parse(readFileSync('./local-splits.json', 'utf-8')),
});
```

### 5.7 Pricing and Plans

| Plan | Price | Features |
|------|-------|----------|
| **Developer** | Free | 1M events/mo, 2 workspaces |
| **Team** | $33/seat/mo | 10M events/mo, 10 workspaces |
| **Enterprise** | Custom | Unlimited events, dedicated support |

### 5.8 Pros and Cons

**Pros:**
- Strong experimentation focus
- Excellent analytics integration
- Built-in statistical significance
- Traffic allocation controls
- Impression tracking
- Good SDK coverage

**Cons:**
- Pricing based on events (can be unpredictable)
- Complex for simple use cases
- No open source option
- Steeper learning curve

---

## 6. Custom Implementation Patterns

### 6.1 Simple File-Based Feature Flags

```typescript
import { readFileSync, watch } from 'fs';
import { resolve } from 'path';
import { EventEmitter } from 'events';

interface FeatureFlagConfig {
  flags: Record<string, {
    enabled: boolean;
    description?: string;
    rollout?: {
      percentage: number;
      salt: string;
    };
    users?: string[];
    groups?: string[];
  }>;
}

class SimpleFeatureFlags extends EventEmitter {
  private config: FeatureFlagConfig = { flags: {} };
  private watcher?: ReturnType<typeof watch>;
  private userCache: Map<string, Map<string, boolean>> = new Map();
  
  constructor(private configPath: string) {
    super();
  }
  
  async init(): Promise<void> {
    this.loadConfig();
    
    // Watch for changes
    this.watcher = watch(this.configPath, (eventType) => {
      if (eventType === 'change') {
        this.loadConfig();
        this.emit('updated', this.config);
      }
    });
  }
  
  private loadConfig(): void {
    try {
      const content = readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(content);
      this.userCache.clear();  // Clear cache on config change
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    }
  }
  
  isEnabled(flagName: string, context?: { userId?: string; groups?: string[] }): boolean {
    const flag = this.config.flags[flagName];
    if (!flag) return false;
    if (!flag.enabled) return false;
    
    // Check user-specific enablement
    if (context?.userId && flag.users?.includes(context.userId)) {
      return true;
    }
    
    // Check group membership
    if (context?.groups && flag.groups) {
      if (context.groups.some(g => flag.groups!.includes(g))) {
        return true;
      }
    }
    
    // Percentage-based rollout
    if (flag.rollout && context?.userId) {
      const cacheKey = `${flagName}:${context.userId}`;
      
      if (!this.userCache.has(context.userId)) {
        this.userCache.set(context.userId, new Map());
      }
      
      const userFlags = this.userCache.get(context.userId)!;
      
      if (!userFlags.has(flagName)) {
        const hash = this.hash(`${flag.rollout.salt}:${context.userId}`);
        const enabled = (hash % 100) < flag.rollout.percentage;
        userFlags.set(flagName, enabled);
      }
      
      return userFlags.get(flagName)!;
    }
    
    return flag.enabled;
  }
  
  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  getAllFlags(): string[] {
    return Object.keys(this.config.flags);
  }
  
  getFlagDetails(flagName: string) {
    return this.config.flags[flagName];
  }
  
  destroy(): void {
    this.watcher?.close();
  }
}

// Configuration file example
// features.json
{
  "flags": {
    "new-dashboard": {
      "enabled": true,
      "description": "New dashboard redesign",
      "rollout": {
        "percentage": 50,
        "salt": "dashboard-v2"
      }
    },
    "beta-api": {
      "enabled": true,
      "description": "Beta API endpoints",
      "users": ["user-1", "user-2"],
      "groups": ["beta-testers"]
    },
    "maintenance-mode": {
      "enabled": false,
      "description": "Kill switch for maintenance"
    }
  }
}
```

### 6.2 Database-Backed Feature Flags

```typescript
import { Pool } from 'pg';
import { EventEmitter } from 'events';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  strategy: 'default' | 'percentage' | 'user_list' | 'attribute';
  strategy_config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

class DatabaseFeatureFlags extends EventEmitter {
  private cache: Map<string, FeatureFlag> = new Map();
  private refreshInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private db: Pool,
    private options: {
      refreshMs?: number;
      tableName?: string;
    } = {}
  ) {
    super();
    this.options.tableName = options.tableName || 'feature_flags';
    this.options.refreshMs = options.refreshMs || 30000;
  }
  
  async init(): Promise<void> {
    await this.loadFlags();
    this.refreshInterval = setInterval(() => this.loadFlags(), this.options.refreshMs!);
  }
  
  private async loadFlags(): Promise<void> {
    const result = await this.db.query<FeatureFlag>(
      `SELECT * FROM ${this.options.tableName}`
    );
    
    const newCache = new Map<string, FeatureFlag>();
    for (const row of result.rows) {
      newCache.set(row.name, row);
    }
    
    // Detect changes
    for (const [name, flag] of newCache) {
      const old = this.cache.get(name);
      if (!old || JSON.stringify(old) !== JSON.stringify(flag)) {
        this.emit('change', name, flag, old);
      }
    }
    
    this.cache = newCache;
    this.emit('loaded', this.cache);
  }
  
  isEnabled(flagName: string, context?: Record<string, any>): boolean {
    const flag = this.cache.get(flagName);
    if (!flag || !flag.enabled) return false;
    
    switch (flag.strategy) {
      case 'default':
        return true;
        
      case 'percentage':
        if (!context?.userId) return false;
        const hash = this.hash(`${flag.name}:${context.userId}`);
        return (hash % 100) < (flag.strategy_config.percentage || 0);
        
      case 'user_list':
        if (!context?.userId) return false;
        return flag.strategy_config.users?.includes(context.userId);
        
      case 'attribute':
        return this.evaluateAttributeRule(flag.strategy_config.rules, context);
        
      default:
        return false;
    }
  }
  
  private evaluateAttributeRule(rules: any[], context?: Record<string, any>): boolean {
    if (!rules || !context) return false;
    
    return rules.every(rule => {
      const value = context[rule.attribute];
      switch (rule.operator) {
        case 'equals': return value === rule.value;
        case 'not_equals': return value !== rule.value;
        case 'in': return rule.value.includes(value);
        case 'gt': return value > rule.value;
        case 'gte': return value >= rule.value;
        case 'lt': return value < rule.value;
        case 'lte': return value <= rule.value;
        case 'contains': return value?.includes(rule.value);
        case 'starts_with': return value?.startsWith(rule.value);
        case 'ends_with': return value?.endsWith(rule.value);
        default: return false;
      }
    });
  }
  
  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  async createFlag(flag: Omit<FeatureFlag, 'created_at' | 'updated_at'>): Promise<void> {
    await this.db.query(
      `INSERT INTO ${this.options.tableName} (name, enabled, strategy, strategy_config)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       strategy = EXCLUDED.strategy,
       strategy_config = EXCLUDED.strategy_config,
       updated_at = NOW()`,
      [flag.name, flag.enabled, flag.strategy, JSON.stringify(flag.strategy_config)]
    );
    await this.loadFlags();
  }
  
  async toggleFlag(name: string, enabled: boolean): Promise<void> {
    await this.db.query(
      `UPDATE ${this.options.tableName} SET enabled = $2, updated_at = NOW() WHERE name = $1`,
      [name, enabled]
    );
    await this.loadFlags();
  }
  
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Database schema
/*
CREATE TABLE feature_flags (
  name VARCHAR(255) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  strategy VARCHAR(50) NOT NULL DEFAULT 'default',
  strategy_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
*/
```

### 6.3 Redis-Backed Feature Flags

```typescript
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

class RedisFeatureFlags extends EventEmitter {
  private localCache: Map<string, any> = new Map();
  private subscriber: Redis;
  
  constructor(
    private redis: Redis,
    private options: {
      prefix?: string;
      cacheTtl?: number;
    } = {}
  ) {
    super();
    this.options.prefix = options.prefix || 'feature:';
    this.options.cacheTtl = options.cacheTtl || 300;
    this.subscriber = new Redis(redis.options);
  }
  
  async init(): Promise<void> {
    // Subscribe to changes
    await this.subscriber.subscribe(`${this.options.prefix}changes`);
    this.subscriber.on('message', (channel, message) => {
      const { flag, action } = JSON.parse(message);
      this.emit('change', flag, action);
      this.localCache.delete(flag);
    });
    
    // Load initial flags
    await this.loadAllFlags();
  }
  
  private async loadAllFlags(): Promise<void> {
    const keys = await this.redis.keys(`${this.options.prefix}*`);
    for (const key of keys) {
      const flagName = key.slice(this.options.prefix!.length);
      const value = await this.redis.get(key);
      if (value) {
        this.localCache.set(flagName, JSON.parse(value));
      }
    }
  }
  
  async isEnabled(flagName: string, context?: { userId?: string }): Promise<boolean> {
    // Check local cache first
    let flag = this.localCache.get(flagName);
    
    if (!flag) {
      // Load from Redis
      const value = await this.redis.get(`${this.options.prefix}${flagName}`);
      if (!value) return false;
      
      flag = JSON.parse(value);
      this.localCache.set(flagName, flag);
    }
    
    if (!flag.enabled) return false;
    
    // Evaluate rollout
    if (flag.rollout && context?.userId) {
      const hash = this.hash(`${flagName}:${context.userId}`);
      return (hash % 100) < flag.rollout;
    }
    
    return true;
  }
  
  async setFlag(flagName: string, config: { enabled: boolean; rollout?: number }): Promise<void> {
    await this.redis.setex(
      `${this.options.prefix}${flagName}`,
      this.options.cacheTtl!,
      JSON.stringify(config)
    );
    
    // Notify other instances
    await this.redis.publish(
      `${this.options.prefix}changes`,
      JSON.stringify({ flag: flagName, action: 'updated' })
    );
    
    this.localCache.set(flagName, config);
  }
  
  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  async destroy(): Promise<void> {
    await this.subscriber.quit();
  }
}
```

### 6.4 Middleware Pattern for Express/Fastify

```typescript
import { Request, Response, NextFunction } from 'express';

// Feature flag middleware
interface FeatureFlagMiddlewareOptions {
  flags: FeatureFlagProvider;
  headerName?: string;
  exposeToClient?: boolean;
}

type FeatureFlagProvider = {
  isEnabled(flagName: string, context?: any): boolean | Promise<boolean>;
  getAllFlags(): Promise<Record<string, any>>;
};

declare global {
  namespace Express {
    interface Request {
      features: {
        isEnabled: (flagName: string) => boolean | Promise<boolean>;
        getAll: () => Promise<Record<string, any>>;
      };
      featureFlags: Record<string, boolean>; // Cached flags for this request
    }
  }
}

export function featureFlagMiddleware(options: FeatureFlagMiddlewareOptions) {
  const headerName = options.headerName || 'X-Feature-Flags';
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = {
      userId: req.user?.id,
      user: req.user,
      headers: req.headers,
      ip: req.ip,
    };
    
    // Create request-specific feature checker
    const featureFlags: Record<string, boolean> = {};
    
    req.features = {
      isEnabled: async (flagName: string) => {
        if (!(flagName in featureFlags)) {
          const enabled = await options.flags.isEnabled(flagName, context);
          featureFlags[flagName] = enabled;
        }
        return featureFlags[flagName];
      },
      getAll: () => options.flags.getAllFlags(),
    };
    
    req.featureFlags = featureFlags;
    
    // Expose enabled flags to client via header
    if (options.exposeToClient) {
      res.on('finish', async () => {
        const enabledFlags = Object.entries(featureFlags)
          .filter(([_, enabled]) => enabled)
          .map(([name]) => name);
        
        if (enabledFlags.length > 0) {
          res.setHeader(headerName, enabledFlags.join(','));
        }
      });
    }
    
    next();
  };
}

// Usage in route
app.get('/api/data', async (req, res) => {
  const useNewApi = await req.features.isEnabled('new-api-format');
  
  if (useNewApi) {
    const data = await fetchNewFormat();
    res.json(data);
  } else {
    const data = await fetchOldFormat();
    res.json(data);
  }
});
```

### 6.5 React Hook for Feature Flags

```typescript
import { useState, useEffect, createContext, useContext } from 'react';

interface FeatureFlagContextValue {
  isEnabled: (flagName: string) => boolean;
  getVariant: (flagName: string) => string | null;
  loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export const FeatureFlagProvider: React.FC<{
  client: FeatureFlagClient;
  userContext?: Record<string, any>;
}> = ({ children, client, userContext }) => {
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadFlags = async () => {
      const allFlags = await client.getFlags(userContext);
      setFlags(allFlags);
      setLoading(false);
    };
    
    loadFlags();
    
    // Subscribe to changes
    const unsubscribe = client.onChange((updatedFlags) => {
      setFlags(prev => ({ ...prev, ...updatedFlags }));
    });
    
    return () => unsubscribe();
  }, [client, userContext]);
  
  const value: FeatureFlagContextValue = {
    isEnabled: (flagName: string) => {
      return flags[flagName]?.enabled ?? false;
    },
    getVariant: (flagName: string) => {
      return flags[flagName]?.variant ?? null;
    },
    loading,
  };
  
  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlag = (flagName: string): boolean => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlag must be used within FeatureFlagProvider');
  }
  return context.isEnabled(flagName);
};

export const useFeatureVariant = (flagName: string): string | null => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureVariant must be used within FeatureFlagProvider');
  }
  return context.getVariant(flagName);
};

export const useFlagsLoading = (): boolean => {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFlagsLoading must be used within FeatureFlagProvider');
  }
  return context.loading;
};

// Usage
function MyComponent() {
  const showNewFeature = useFeatureFlag('new-feature');
  const buttonVariant = useFeatureVariant('checkout-button');
  
  if (showNewFeature) {
    return <NewFeature />;
  }
  
  return (
    <button className={`btn-${buttonVariant || 'default'}`}>
      Checkout
    </button>
  );
}
```

---

## 7. Feature Flag Architecture

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Feature Flag System Architecture               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Control Plane                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │   Admin UI   │  │   API        │  │   Auditing   │   │   │
│  │  │   (React)    │  │   (REST/GRPC)│  │   & Logging  │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│  ┌────────────────────────┼───────────────────────────────┐   │
│  │                    Data Plane                          │   │
│  │  ┌──────────────┐      │      ┌──────────────┐          │   │
│  │  │   Primary    │◀─────┴─────▶│   Replica    │          │   │
│  │  │   Store      │             │   Store      │          │   │
│  │  │  (Postgres)  │             │  (Redis)     │          │   │
│  │  └──────────────┘             └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│           ┌───────────────┼───────────────┐                   │
│           │               │               │                    │
│  ┌────────▼───────┐ ┌─────▼──────┐ ┌──────▼──────┐           │
│  │   SDK (Web)    │ │   SDK (iOS)│ │   SDK (Node)│           │
│  │   ┌──────────┐ │ │  ┌────────┐ │ │  ┌────────┐ │           │
│  │   │  Cache   │ │ │  │  Cache │ │ │  │  Cache │ │           │
│  │   │ (5 min)  │ │ │  │(5 min) │ │ │  │(5 min) │ │           │
│  │   └──────────┘ │ │  └────────┘ │ │  └────────┘ │           │
│  └────────────────┘ └─────────────┘ └─────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Evaluation Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    Flag Evaluation Flow                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Application requests flag evaluation                      │
│     ┌──────────┐                                              │
│     │  App     │──▶ isEnabled('new-feature', context)       │
│     └──────────┘                                              │
│           │                                                    │
│  2. Check local cache                                          │
│           │                                                    │
│           ▼                                                    │
│     ┌──────────┐                                               │
│     │  Cache   │──▶ Cache hit?                                 │
│     │  (5 min) │      ├── YES ──▶ Return cached result        │
│     └──────────┘      └── NO  ──▶ Continue evaluation         │
│           │                                                    │
│  3. Load flag rules from source                                │
│           │                                                    │
│           ▼                                                    │
│     ┌──────────┐                                               │
│     │  Rules   │──▶ Load flag definition                      │
│     │  Engine  │                                               │
│     └──────────┘                                               │
│           │                                                    │
│  4. Evaluate rules in priority order                           │
│           │                                                    │
│           ▼                                                    │
│     ┌─────────────────────────────────────────────────────┐   │
│     │  Rule Priority (highest to lowest)                  │   │
│     │  ┌──────────────────────────────────────────────┐   │   │
│     │  │ 1. Kill switch (immediate off)              │   │   │
│     │  │ 2. Individual user targeting                │   │   │
│     │  │ 3. Segment targeting                        │   │   │
│     │  │ 4. Percentage rollout                       │   │   │
│     │  │ 5. Default value                            │   │   │
│     │  └──────────────────────────────────────────────┘   │   │
│     └─────────────────────────────────────────────────────┘   │
│           │                                                    │
│  5. Apply evaluation result                                    │
│           │                                                    │
│           ▼                                                    │
│     ┌──────────┐                                               │
│     │  Result  │──▶ Update cache                              │
│     │  (bool)  │──▶ Record impression (async)                  │
│     └──────────┘──▶ Return to application                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 8. Best Practices

### 8.1 Naming Conventions

```
Feature Flag Naming:

Format: {component}-{action}-{variant}

Good Examples:
- checkout-new-payment-flow
- dashboard-dark-mode
- api-v2-response-format
- auth-mfa-required

Bad Examples:
- newFeature (too vague)
- feature1 (no meaning)
- test (temporary name)
- flag123 (no meaning)

Categories:
- release-*: Release toggles (temporary)
- experiment-*: A/B tests
- ops-*: Operational toggles (kill switches)
- permission-*: Permission-based access
- config-*: Configuration values
```

### 8.2 Lifecycle Management

```typescript
// Feature flag lifecycle states
enum FlagLifecycle {
  DEVELOPMENT = 'development',    // Internal testing only
  CANARY = 'canary',              // Small percentage of users
  ROLLOUT = 'rollout',            // Gradual percentage increase
  GENERAL_AVAILABILITY = 'ga',   // 100% of users
  DEPRECATED = 'deprecated',      // Scheduled for removal
  ARCHIVED = 'archived',          // Removed from code
}

interface FlagMetadata {
  name: string;
  lifecycle: FlagLifecycle;
  createdAt: Date;
  owner: string;
  description: string;
  removalDate?: Date;
  jiraTicket?: string;
}

// Lifecycle transition rules
class FlagLifecycleManager {
  private flags: Map<string, FlagMetadata> = new Map();
  
  async transitionFlag(name: string, newLifecycle: FlagLifecycle): Promise<void> {
    const flag = this.flags.get(name);
    if (!flag) throw new Error(`Flag ${name} not found`);
    
    const validTransitions: Record<FlagLifecycle, FlagLifecycle[]> = {
      [FlagLifecycle.DEVELOPMENT]: [FlagLifecycle.CANARY],
      [FlagLifecycle.CANARY]: [FlagLifecycle.ROLLOUT, FlagLifecycle.GENERAL_AVAILABILITY],
      [FlagLifecycle.ROLLOUT]: [FlagLifecycle.GENERAL_AVAILABILITY],
      [FlagLifecycle.GENERAL_AVAILABILITY]: [FlagLifecycle.DEPRECATED],
      [FlagLifecycle.DEPRECATED]: [FlagLifecycle.ARCHIVED],
      [FlagLifecycle.ARCHIVED]: [],
    };
    
    if (!validTransitions[flag.lifecycle].includes(newLifecycle)) {
      throw new Error(
        `Invalid transition from ${flag.lifecycle} to ${newLifecycle}`
      );
    }
    
    flag.lifecycle = newLifecycle;
    
    // Update rollout percentage based on lifecycle
    if (newLifecycle === FlagLifecycle.CANARY) {
      await this.setRolloutPercentage(name, 5);
    } else if (newLifecycle === FlagLifecycle.GENERAL_AVAILABILITY) {
      await this.setRolloutPercentage(name, 100);
    }
    
    await this.persistMetadata(flag);
  }
  
  async archiveStaleFlags(staleDays: number = 30): Promise<string[]> {
    const archived: string[] = [];
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
    
    for (const [name, flag] of this.flags) {
      if (flag.lifecycle === FlagLifecycle.GENERAL_AVAILABILITY &&
          flag.createdAt < cutoff) {
        await this.transitionFlag(name, FlagLifecycle.DEPRECATED);
        archived.push(name);
      }
    }
    
    return archived;
  }
  
  private async setRolloutPercentage(name: string, percentage: number): Promise<void> {
    // Implementation to update rollout percentage
  }
  
  private async persistMetadata(flag: FlagMetadata): Promise<void> {
    // Save to database
  }
}
```

### 8.3 Testing with Feature Flags

```typescript
// Test helpers for feature flags
import { describe, it, expect, beforeEach } from 'vitest';

class TestFeatureFlagProvider {
  private flags: Map<string, { enabled: boolean; variant?: string }> = new Map();
  
  enable(flagName: string, variant?: string): void {
    this.flags.set(flagName, { enabled: true, variant });
  }
  
  disable(flagName: string): void {
    this.flags.set(flagName, { enabled: false });
  }
  
  isEnabled(flagName: string): boolean {
    return this.flags.get(flagName)?.enabled ?? false;
  }
  
  getVariant(flagName: string): string | undefined {
    return this.flags.get(flagName)?.variant;
  }
  
  reset(): void {
    this.flags.clear();
  }
}

// Test usage
const testFlags = new TestFeatureFlagProvider();

beforeEach(() => {
  testFlags.reset();
});

describe('Checkout with new payment flow', () => {
  it('should use new flow when flag is enabled', () => {
    testFlags.enable('checkout-new-payment-flow');
    
    const result = processCheckout(testFlags);
    
    expect(result.flow).toBe('new');
  });
  
  it('should use old flow when flag is disabled', () => {
    testFlags.disable('checkout-new-payment-flow');
    
    const result = processCheckout(testFlags);
    
    expect(result.flow).toBe('old');
  });
  
  it('should show blue button for variant A', () => {
    testFlags.enable('checkout-button-color', 'blue');
    
    const result = renderCheckoutButton(testFlags);
    
    expect(result.color).toBe('blue');
  });
});
```

### 8.4 Monitoring and Observability

```typescript
// Feature flag metrics
interface FlagMetrics {
  flagName: string;
  evaluations: number;
  enabledCount: number;
  disabledCount: number;
  latencyMs: number[];
  errors: number;
}

class FeatureFlagMetricsCollector {
  private metrics: Map<string, FlagMetrics> = new Map();
  
  recordEvaluation(flagName: string, enabled: boolean, latencyMs: number): void {
    let metric = this.metrics.get(flagName);
    if (!metric) {
      metric = {
        flagName,
        evaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        latencyMs: [],
        errors: 0,
      };
      this.metrics.set(flagName, metric);
    }
    
    metric.evaluations++;
    if (enabled) {
      metric.enabledCount++;
    } else {
      metric.disabledCount++;
    }
    metric.latencyMs.push(latencyMs);
    
    // Keep only last 1000 latency samples
    if (metric.latencyMs.length > 1000) {
      metric.latencyMs = metric.latencyMs.slice(-1000);
    }
  }
  
  recordError(flagName: string): void {
    const metric = this.metrics.get(flagName);
    if (metric) {
      metric.errors++;
    }
  }
  
  getMetrics(flagName?: string): FlagMetrics | Map<string, FlagMetrics> {
    if (flagName) {
      return this.metrics.get(flagName)!;
    }
    return new Map(this.metrics);
  }
  
  // Export metrics for Prometheus
  toPrometheusFormat(): string {
    const lines: string[] = [];
    
    for (const [name, metric] of this.metrics) {
      lines.push(`# HELP feature_flag_evaluations_total Total flag evaluations`);
      lines.push(`# TYPE feature_flag_evaluations_total counter`);
      lines.push(`feature_flag_evaluations_total{flag="${name}"} ${metric.evaluations}`);
      
      lines.push(`# HELP feature_flag_enabled_ratio Ratio of enabled evaluations`);
      lines.push(`# TYPE feature_flag_enabled_ratio gauge`);
      const ratio = metric.evaluations > 0 ? metric.enabledCount / metric.evaluations : 0;
      lines.push(`feature_flag_enabled_ratio{flag="${name}"} ${ratio}`);
      
      lines.push(`# HELP feature_flag_latency_ms Evaluation latency`);
      lines.push(`# TYPE feature_flag_latency_ms histogram`);
      const avgLatency = metric.latencyMs.reduce((a, b) => a + b, 0) / metric.latencyMs.length;
      lines.push(`feature_flag_latency_ms{flag="${name}",quantile="0.95"} ${avgLatency}`);
    }
    
    return lines.join('\n');
  }
}
```

---

## 9. References

### Official Documentation

1. **LaunchDarkly Docs**: docs.launchdarkly.com
2. **Unleash Docs**: docs.getunleash.io
3. **Flagsmith Docs**: docs.flagsmith.com
4. **Split.io Docs**: help.split.io

### Books and Articles

1. "Feature Toggles (aka Feature Flags)" - Martin Fowler
2. "Continuous Delivery" - Jez Humble, David Farley
3. "Trunk-Based Development" - Paul Hammant
4. "Testing Strategies with Feature Toggles" - Pete Hodgson

### Research Papers

1. "Continuous Deployment at Facebook" - Facebook Engineering
2. "The Evolution of Release Engineering" - Google
3. "Feature Flags: A Change Management Strategy" - ACM

### Open Source Projects

| Project | Language | GitHub |
|---------|----------|--------|
| Unleash | Node.js | github.com/Unleash/unleash |
| Flagsmith | Python | github.com/Flagsmith/flagsmith |
| Flipt | Go | github.com/flipt-io/flipt |
| GrowthBook | TypeScript | github.com/growthbook/growthbook |
| PostHog | Python | github.com/PostHog/posthog |

---

## Document Metadata

- **Version**: 1.0.0
- **Last Updated**: 2026-04-02
- **Maintainer**: Phenotype Architecture Team
- **Review Cycle**: Quarterly
- **Status**: Active Research

---

*This document is a living research artifact. Updates should be proposed via ADR process and approved by the architecture team.*
