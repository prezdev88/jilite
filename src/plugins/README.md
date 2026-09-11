# Jilite Plugins Architecture Boundaries

The codebase enforces strict architectural boundaries to maintain decoupling between features and the core application. 
An automated check (\`tests/architecture-boundaries.cjs\`) runs in CI to verify these rules.

## Permitted Directions

1. **Plugin to SDK / Core:** Plugins are allowed to import public contracts, stable shared components, and the Plugin SDK (e.g., \`@/plugins/server-runtime\`).
2. **Composition Roots to Plugins:** Only specific composition roots (like \`registry.tsx\`, \`server-registry.ts\`, \`manifest-registry.ts\`) are allowed to import concrete plugin implementations to assemble the final application.

## Forbidden Directions

1. **Plugin to Plugin:** A plugin cannot import files from another plugin directly (neither statically nor dynamically). They must communicate through public contracts, events, or shared state via the core.
2. **Core to Plugin:** Core libraries and generic application code must not import concrete plugins outside of the explicitly allowed composition roots.
