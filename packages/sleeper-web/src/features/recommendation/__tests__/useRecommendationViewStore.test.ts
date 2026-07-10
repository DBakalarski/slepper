import { describe, expect, it, vi } from 'vitest';

// `useRecommendationViewStore` importuje `Platform` z 'react-native' (Flow
// syntax, niewspierane przez esbuild/vitest node env) i AsyncStorage —
// mockujemy oba PRZED dynamicznym importem modulu, zeby uniknac parsowania
// prawdziwego pakietu react-native. Wzorzec zweryfikowany na `useThemeStore`
// (ten sam storage adapter 1:1).
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));

describe('useRecommendationViewStore', () => {
  it('default view to "timeline" (glowny widok karty rekomendacji)', async () => {
    const { useRecommendationViewStore } = await import('../useRecommendationViewStore');
    expect(useRecommendationViewStore.getState().view).toBe('timeline');
  });

  it('setView("list") przelacza widok na "list"', async () => {
    const { useRecommendationViewStore } = await import('../useRecommendationViewStore');
    useRecommendationViewStore.getState().setView('list');
    expect(useRecommendationViewStore.getState().view).toBe('list');
  });
});
