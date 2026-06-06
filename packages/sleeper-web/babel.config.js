module.exports = function (api) {
  api.cache(true);
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
