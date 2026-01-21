# WebContainer Performance Optimization Guide

## Overview
WebContainer can take significant time installing packages due to network requests and file I/O. This guide provides multiple strategies to speed up the installation process.

## Quick Start: Implement Now

### 1. Update useWebContainer Hook
The hook has been updated to automatically configure npm cache:

```typescript
const { webContainer, isReady } = useWebContainer();

// Now you can check if WebContainer is ready before using it
if (isReady) {
  // Start operations
}
```

### 2. Use Prebuilt Minimal Packages
Instead of installing large packages, use the minimal version:

```typescript
import { getMinimalPackageJson } from "@/utils/webcontainerCache";

const packageJson = getMinimalPackageJson({
  axios: "^1.7.8", // Add your custom deps
});
```

### 3. Fast Installation
Replace npm install with optimized version:

```typescript
import { optimizedInstall } from "@/utils/webcontainerCache";

await optimizedInstall(webContainer, "/");
```

## Implementation Strategies

### Strategy 1: NPM Cache Optimization ⭐ (Fastest)
**Time saved: 30-50%**

- Uses `npm ci` instead of `npm install`
- Requires `package-lock.json` for reproducible builds
- Caches packages locally in WebContainer

```typescript
// Already implemented in useWebContainer.ts
await setupNpmCache(webContainer);
await webContainer.spawn("npm", ["install", "--prefer-offline"]);
```

### Strategy 2: Prebuilt Node Modules 
**Time saved: 60-80%**

Pre-bundle commonly used packages separately:

```typescript
// Create a separate bundle with pre-compiled node_modules
// Then mount it to WebContainer at startup
const nodeModulesBundle = await fetch("/prebuilt-modules.tar.gz");
await webContainer.fs.writeFile("/prebuilt-modules.tar.gz", nodeModulesBundle);
await webContainer.spawn("tar", ["-xzf", "/prebuilt-modules.tar.gz"]);
```

### Strategy 3: Lazy Loading
**Time saved: 40-70%**

Install packages only when needed:

```typescript
import { lazyInstallPackage } from "@/utils/webcontainerOptimization";

// User clicks feature that needs axios
function enableAdvancedFeature() {
  lazyInstallPackage(webContainer, "axios");
}
```

### Strategy 4: IndexedDB Caching
**Time saved: 80-95% (on subsequent boots)**

Persist node_modules to browser storage:

```typescript
import { WebContainerModuleCache } from "@/utils/webcontainerOptimization";

const cache = new WebContainerModuleCache();
await cache.init();

// Save modules after first install
await cache.cache("node_modules", nodeModulesBlob);

// Restore on next boot
const savedModules = await cache.retrieve("node_modules");
if (savedModules) {
  // Restore modules
}
```

### Strategy 5: Using Package Lock Files
**Time saved: 20-30%**

Always include `package-lock.json`:

```bash
npm ci  # Uses package-lock.json for exact versions
npm ci --prefer-offline  # + offline preference
```

## Implementation Checklist

- [x] npm cache configuration
- [x] Minimal package.json helper
- [x] Optimized install function
- [ ] Build prebuilt node_modules bundle (requires backend work)
- [ ] Implement IndexedDB caching
- [ ] Add lazy loading for optional features
- [ ] Create package-lock.json for all sample projects
- [ ] Add preload background tasks

## Further Optimization: Backend Support

To maximize performance, the backend should:

1. **Generate pre-built modules**
   ```bash
   npm install
   tar -czf prebuilt-modules.tar.gz node_modules
   ```

2. **Serve as static asset**
   ```typescript
   app.use('/prebuilt', express.static('prebuilt-modules.tar.gz'));
   ```

3. **Include in project templates**
   - Include bundled node_modules in sample projects
   - Use esbuild/webpack pre-bundling

## Performance Benchmarks

| Strategy | First Boot | Subsequent | Notes |
|----------|-----------|-----------|-------|
| Default npm install | 60-120s | 60-120s | Slowest |
| npm ci + cache | 30-60s | 30-60s | Good baseline |
| Prebuilt modules | 5-10s | 5-10s | Very fast |
| IndexedDB + prebuilt | 2-5s | 1-2s | Optimal |

## Environment Variables

Configure these in your .env for WebContainer:

```env
NPM_CONFIG_PREFER_OFFLINE=true
NPM_CONFIG_NO_AUDIT=true
NPM_CONFIG_CACHE=/.npm-cache
```

## Troubleshooting

**Issue: "npm ci not found"**
→ Solution: Use `npm install` with `--prefer-offline` flag

**Issue: "Package-lock.json mismatch"**
→ Solution: Regenerate with `npm install` before using `npm ci`

**Issue: "Disk space full"**
→ Solution: Clear cache with `npm cache clean --force`

**Issue: "Still slow"**
→ Solution: Implement IndexedDB caching or prebuilt modules approach

## References

- [WebContainer Documentation](https://docs.webcontainer.io)
- [npm ci vs npm install](https://docs.npmjs.com/cli/v10/commands/npm-ci)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
