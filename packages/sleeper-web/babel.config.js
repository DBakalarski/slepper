module.exports = function (api) {
  // P2.1 (review fazy 4): `api.cache(true)` permamentnie cachuje pierwszy odczyt
  // configu bez relookupa NODE_ENV — efektywnie wylacza prod transform jesli pierwsze
  // wywolanie babel bylo dev. `cache.using(() => NODE_ENV)` invaliduje cache per env.
  api.cache.using(() => process.env.NODE_ENV);
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // PROD-only: usun `console.*` calls z bundle (eliminuje leak
      // diagnostycznych logow ze sleeper-app warnings/error paths +
      // marginalnie redukuje bundle size).
      // Adresuje: Faza 2 P2.3 (hooks.ts:293 console.warn leak) +
      // Faza 3 P3.2 (sam P2.3 wrapped) + Faza 1 P3 supabase.ts warn.
      ...(isProduction ? [['transform-remove-console', { exclude: ['error'] }]] : []),
    ],
  };
};
