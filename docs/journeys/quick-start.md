# Quick Start Journey

<UserJourney
    :steps="[
        { title: 'Install', desc: 'Install phenotype-config-ts package' },
        { title: 'Configure', desc: 'Set up basic configuration' },
        { title: 'Run', desc: 'Execute first operation' }
    ]"
    :duration="5"
    :gif-src="'/gifs/phenotype-config-ts-quickstart.gif'"
/>

## Step-by-Step

### 1. Installation

```bash
# Install via cargo/npm/pip
cargo add phenotype-config-ts
# or
npm install @phenotype-config-ts/core
```

### 2. Basic Configuration

```yaml
# config.yaml
name: my-project
environment: development
```

### 3. First Operation

```rust
// Example usage
use phenotype-config-ts::Client;

#[tokio::main]
async fn main() {
    let client = Client::new().await;
    let result = client.process().await;
    println!("{:?}", result);
}
```

## Verification

Run the built-in health check:

```bash
cargo test --lib
```
