# Hello World Story

<StoryHeader
    title="Your First phenotype-config-ts Operation"
    :duration="2"
    :gif="'/gifs/phenotype-config-ts-hello-world.gif'"
    difficulty="beginner"
/>

## Objective

Get phenotype-config-ts running with a basic operation.

## Prerequisites

- Rust/Node/Python installed
- phenotype-config-ts package installed

## Implementation

```rust
use phenotype-config-ts::Client;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize client
    let client = Client::new().await?;
    
    // Execute operation
    let result = client.hello().await?;
    
    println!("Success: {}", result);
    Ok(())
}
```

## Expected Output

```
Success: Hello from phenotype-config-ts!
```

## Next Steps

- [Core Integration](./core-integration)
- Read [API Reference](../reference/api)
