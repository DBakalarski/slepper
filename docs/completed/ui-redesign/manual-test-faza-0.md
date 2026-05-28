# Manual test checklist — Faza 0 (Design system foundation)

**Status:** do wykonania on-device (iOS + Android via Expo Go)
**Wygenerowano:** 2026-05-28 (Agent 5 mobile-feature-tester w ramach review fazy 0)

> Faza 0 to czysty foundation — kolory, primitives, helper. Same primitives nie są jeszcze konsumowane na żadnym ekranie. Manualne testy on-device sensownie wykonać DOPIERO po Fazie 2 (tab icons) lub Fazie 3 (Dzisiaj), gdy primitives wchodzą na ekran. Ta checklista zostaje jako kotwica — odznacz po wpięciu primitives w pierwsze ekrany.

## Tokeny (tailwind.config.js)

- [ ] Walidacja wartości eye-dropperem: porównaj na finalnym ekranie (Profil karta dziecka — Faza 5) kolor `bg-purple-light` z odcieniem na screenie #3. Tolerancja ±5% per kanał RGB.
- [ ] Walidacja `purple-soft`, `success`, `success-soft`, `orange-soft`, `text-muted` po Fazie 3/4/5 — każdy odcień widoczny na produkcyjnym ekranie zgodny ze screenami #1/#2/#3.
- [ ] `shadow-card` renderuje się na iOS (cień widoczny ~4px pod kartą, lekko po prawej, opacity ~4%).
- [ ] `shadow-card` renderuje się na Android (elevation widoczny — NativeWind v4 mapuje boxShadow → `elevation` property; pierwsza karta Today/Profil powinna mieć subtelny cień, NIE czarny prostokąt).
- [ ] Jeśli `shadow-card` na Androidzie wygląda źle (np. zbyt mocny lub brak) — fallback: zastąpić native `shadowColor/Offset/Opacity/Radius` props (notatka w `ui-redesign-plan.md` linia 122).

## Primitives — smoke test on-device

> Wykonuj po pierwszym wpięciu primitives w realny ekran (Faza 2+).

### Avatar
- [ ] Inicjał wyśrodkowany w kółku (sm/md/lg).
- [ ] Tło z `color` HEX zachowuje się jak na mockupie (np. `child.avatar_color` z bazy daje poprawny odcień).
- [ ] VoiceOver/TalkBack czyta `name` zamiast literki (włącz screen reader i tap na avatar).

### Card
- [ ] `variant="default"` — białe tło w light mode, `dark-card` w dark mode.
- [ ] `variant="gradient"` — purple-light tło w light, dark-surface w dark.
- [ ] Rounded corners 20px (radius `card`) widoczne na wszystkich rogach.

### Badge
- [ ] 3 warianty (success/neutral/orange) — kolor tła + tekst zgodny ze screenami (Drzemka za, Etap, itp.).
- [ ] Tekst nie wychodzi poza pill (różne długości label).

### IconButton
- [ ] Tap area ≥44pt (dla size md/lg). Sprawdź przez `Accessibility Inspector` w Xcode/Android Studio lub na żywo — łatwo trafić palcem.
- [ ] `showDot=true` → kropka w prawym górnym rogu (matchuje screen #1 bell).
- [ ] VoiceOver czyta `accessibilityLabel` — np. "Powiadomienia, przycisk".

### ProgressBar
- [ ] `value=0` → pusty pasek.
- [ ] `value=1` → pełny pasek.
- [ ] `value=NaN` lub poza 0..1 → pasek nie crashuje, pokazuje 0.
- [ ] Tint purple w light, purple-light w dark.

### ProgressBarStacked
- [ ] 3 segmenty (Sen nocny/Drzemki/Aktywność) widoczne obok siebie, sumarycznie ≤ 100% szerokości.
- [ ] Sum > 1 → renormalizacja proporcjonalna (sprawdź wizualnie że proporcje zachowane).
- [ ] Pusta tablica `[]` → tylko track, brak crash.

### ProgressRing
- [ ] `value=0.98` → pierścień prawie pełny, start na godz. 12 (nie po prawej!).
- [ ] `label="98%"` wyśrodkowany w środku ringa.
- [ ] Rendering na iOS i Android identyczny (SVG cross-platform).
- [ ] Animacja fade-in (Faza 6) działa gładko.

### SegmentedControl
- [ ] 2 opcje (Lista/Kalendarz) — animacja jeźdźca 200ms gładka na iOS.
- [ ] **Critical**: animacja na Androidzie NIE zacina się (powód użycia `withTiming` zamiast `withSpring` — patrz kontekst).
- [ ] Tap zmienia stan natychmiast (bez delay), VoiceOver ogłasza `selected: true/false`.
- [ ] Layout: równe szerokości segmentów po pierwszym render (onLayout).

### Switch
- [ ] Track on = purple (#7C6BAD), off = purple-soft.
- [ ] Thumb cream (#F5F0E8) na obu stanach.
- [ ] Disabled state widoczny (RN Switch domyślny opacity).

### Sleep norm (helper)
- [ ] Dziecko 6m → `12-16g/dobe`.
- [ ] Dziecko 24m → `11-14g/dobe`.
- [ ] Dziecko 48m → `10-13g/dobe`.
- [ ] Sprawdzić w Profilu (Faza 5) — różne dzieci dają różne normy.

## Final regression

- [ ] Brak crash w Expo Go przy montowaniu primitives (console.error w Metro).
- [ ] Brak warningów `key` / `accessibility` przy renderze SegmentedControl, ProgressBarStacked.
- [ ] Bundle build time bez wzrostu > 10% (dodanie `react-native-svg` tranzytywnie — sprawdź `npx expo start --clear`).

## Notatka

Wszystkie powyższe checkboxy są **non-blocking dla mergu Fazy 0** — Faza 0 to czysty foundation bez konsumentów. Wykonaj on-device DOPIERO po Fazie 2/3, gdy primitives wchodzą na ekran. Wtedy odznacz tutaj checkboxy i ewentualne issues zgłoś jako bug fix w odpowiedniej fazie.
