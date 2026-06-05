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

module.exports = withNativeWind(config, { input: './src/global.css' });
