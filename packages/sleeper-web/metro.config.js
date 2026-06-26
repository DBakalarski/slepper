// Monorepo Metro config — watches workspace root so changes in sibling
// packages (e.g. sleeper-machine/dist) trigger reload. Required for
// pnpm workspaces because pnpm uses symlinks and Metro doesn't follow
// them outside the project root by default.

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so cross-package edits trigger HMR).
config.watchFolders = [monorepoRoot];

// 2. Look for modules in this app's node_modules first, then root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Disable hierarchical lookup to avoid resolving phantom deps from
//    other workspaces (pnpm isolation guarantees + Metro determinism).
config.resolver.disableHierarchicalLookup = true;

// 4. Ikony lucide: kod aplikacji importuje wylacznie przez `@/lib/icons`
//    (deep importy per-ikona z `lucide-react`). NIE ma juz aliasu
//    `lucide-react-native` -> `lucide-react`, bo `resolver.alias` i tak byl
//    cicho ignorowany przy `expo export` (custom `resolveRequest` ponizej go
//    przeslanial), przez co bundle wciagal pelne `lucide-react-native` ze
//    WSZYSTKIMI ~1500 ikonami (~1.3 MB). Patrz `src/lib/icons.ts`.

// 5. Custom resolveRequest dla zustand → wymuszone CJS buildy.
//    zustand@5 ESM (`esm/index.mjs`, `esm/middleware.mjs`) używa
//    `import.meta.env.MODE` (Vite-style guard dla devtools).
//    Metro web target NIE transformuje `import.meta`, raw token ląduje
//    w klasycznym `<script defer>` bundle → `Uncaught SyntaxError: Cannot
//    use 'import.meta' outside a module` → white screen.
//    CJS buildy (`middleware.js`, `index.js`) NIE mają `import.meta`.
//    `resolver.alias` z subpath ('zustand/middleware') jest zawodny gdy
//    package.json#exports kieruje na `.mjs` — custom resolveRequest
//    deterministycznie przepina na `.js`. (review Fazy 3 P1.1)
const path_ = path;
const zustandRoot = path_.dirname(require.resolve('zustand/package.json'));
const ZUSTAND_CJS_MAP = {
  zustand: path_.join(zustandRoot, 'index.js'),
  'zustand/middleware': path_.join(zustandRoot, 'middleware.js'),
  'zustand/vanilla': path_.join(zustandRoot, 'vanilla.js'),
  'zustand/react': path_.join(zustandRoot, 'react.js'),
  'zustand/shallow': path_.join(zustandRoot, 'shallow.js'),
  'zustand/traditional': path_.join(zustandRoot, 'traditional.js'),
};

const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && ZUSTAND_CJS_MAP[moduleName]) {
    return {
      type: 'sourceFile',
      filePath: ZUSTAND_CJS_MAP[moduleName],
    };
  }
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
