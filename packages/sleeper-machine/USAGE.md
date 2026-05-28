# Sleeper Machine — Usage Guide

Praktyczny przewodnik integracji algorytmu w aplikacji (np. Expo / React Native).
Specyfikacja algorytmu: `PLAN.md`. Quickstart i wybór sposobu integracji: `README.md`.

---

## Public API — jedna funkcja

```ts
import { recommend } from 'sleeper-machine';

function recommend(state: State, profile: ChildProfile): Recommendation;
```

Wszystkie inne eksporty (typy, brand factories) są pomocnicze. Nie ma stanu, nie ma init, nie ma cleanup. `recommend()` jest **czystą funkcją** — ten sam input zawsze daje ten sam output.

---

## Input — `State` i `ChildProfile`

### `ChildProfile`

Profil dziecka. Zmienia się rzadko (tylko gdy user edytuje ustawienia).

```ts
type ChildProfile = {
  readonly dateOfBirth: Date;            // wymagane — używane do wyliczenia wieku
  readonly targetWakeTime?: TimeOfDay;   // opcjonalne — { hour: 0-23, minute: 0-59 }
};
```

**`dateOfBirth`** — `Date` (nie ISO string!). Konwertuj na boundary aplikacji.

**`targetWakeTime`** — godzina o której user chce żeby dziecko wstawało rano. Jeśli ją podasz, algorytm dopasuje plan dnia tak, żeby pobudka następnego dnia była ≈ o tej godzinie (z safety rail ±20% — patrz warning *targetWakeTime poza zakresem*). Jeśli nie podasz: cold start zwróci `nextSleepAt: null` + warning *brak kotwicy*, bo nie zgadujemy 7:00 jako default (poranna pobudka to **główna kotwica rytmu okołodobowego** — Flynn-Evans 2018; nie wymyślamy jej za usera).

### `State`

Bieżący stan — odświeżasz przy każdym renderze lub gdy user doda sesję.

```ts
type State = {
  readonly now: DateTime;                       // teraźniejszość (Date)
  readonly history: readonly SleepSession[];    // wszystkie sesje snu, dowolna kolejność
};

type SleepSession = {
  readonly start: Date;
  readonly end: Date;       // MUSI być > start (recommend throwuje na end ≤ start)
  readonly type: 'NIGHT' | 'NAP';
};
```

**`now`** — `new Date()` na boundary aplikacji. Algorytm wewnątrz nigdy nie wywołuje `Date.now()` ani `new Date()` bez argumentów — *Ty* dostarczasz "teraz". To celowe: testowalność + determinizm.

**`history`** — pełna historia. Algorytm sam wytnie ostatnie 14 dni dla totalSleep/naps/longest i ostatnie 7 dla observedMorningWake. Możesz trzymać całość, ale optymalizacja: filtruj do ~21 ostatnich dni przed przekazaniem (mniej alokacji w `.filter()`).

**`type: 'NIGHT'` vs `'NAP'`** — `NIGHT` to długi sen nocny (ten jeden dziennie). `NAP` to drzemka. Klasyfikację robi user przy logowaniu. Nie różnicuj heurystyką — pozwól userowi decydować, bo np. transfer 18:00→20:00 może być long nap albo wczesny bedtime.

---

## Output — `Recommendation`

```ts
type Recommendation = {
  readonly nextSleepAt: Date | null;
  readonly currentWakeWindowDuration: Minutes;   // branded number
  readonly remainingNapsToday: readonly PlanEntry[];
  readonly confidence: 'low' | 'medium' | 'high';
  readonly warnings: readonly string[];
};

type PlanEntry = {
  readonly plannedStart: Date;
  readonly plannedEnd?: Date;   // obecne dla NAP, brak dla NIGHT (bedtime to start, nie wiemy kiedy się skończy)
  readonly type: 'NIGHT' | 'NAP';
};
```

### `nextSleepAt: Date | null`

**Kiedy go pokazujesz:** zegar odliczający do następnego położenia spać. *"Pora spać o 10:30"*.

**Gdy `null`:** nie ma kotwicy do liczenia (cold start bez `targetWakeTime` i bez historii). Pokaż pusty stan: *"Dodaj pierwszą sesję snu lub ustaw godzinę pobudki, żeby zobaczyć rekomendację"*. NIE wymyślaj defaultu — w warnings będzie *brak kotwicy czasowej...*.

**Format:** `Date`. Sformatuj `toLocaleTimeString()` lub date-fns. Strefa = lokalna urządzenia (algorytm liczy w lokalnej TZ).

### `currentWakeWindowDuration: Minutes`

Długość bieżącego okna czuwania (od ostatniej pobudki / końca ostatniej drzemki do najbliższego snu). **Branded number** — pod spodem to plain number minut.

**Kiedy go pokazujesz:** pasek postępu *"Czuwa już 2h 15min z 3h"* (potrzebujesz też `lastWakeTime`, którego algorytm nie zwraca explicit — wylicz go z history: ostatni `NAP.end` z dzisiaj, albo morningWake jeśli żadnego napu jeszcze nie było).

**Gdy 0:** brak kotwicy (jak wyżej) lub user już przekroczył wszystkie zaplanowane okna (jest po `bedtime`). Wtedy ukryj pasek.

### `remainingNapsToday: readonly PlanEntry[]`

Pozostały plan na dziś — drzemki które jeszcze nie nastąpiły + bedtime. Filtrowane po `plannedStart > state.now`.

**Kiedy go pokazujesz:** lista *"Plan reszty dnia"* w sekcji "Co dalej". Ostatni element to zawsze `type: 'NIGHT'` (bedtime) — wyróżnij go ikoną księżyca.

**`plannedEnd`:** dla NAP — przewidywany koniec (start + średnia długość drzemki). Dla NIGHT — `undefined` (bo długość zależy od następnego porannego wake event).

**Pusty array:** dzień się skończył lub `nextSleepAt === null`.

### `confidence: 'low' | 'medium' | 'high'`

Liczba dni z historią danych:
- **`low`** (n < 3): algorytm głównie używa baseline Galland 2012, mało personalizacji
- **`medium`** (3 ≤ n < 7): EWMA zaczyna ważyć obserwacje, ale niska próbka
- **`high`** (n ≥ 7): pełna personalizacja, α może spaść do 0.3 (przy n=14)

**UX:**
- `low` → badge *"Mała pewność"* + CTA *"Dodaj sesje z 7 ostatnich dni"*
- `medium` → mały badge *"Średnia pewność"* lub nic
- `high` → nic (cisza = dobry znak)

Nie blokuj feature'ów na `low` — daj rekomendacje od pierwszego dnia, tylko sygnalizuj że są zachowawcze.

### `warnings: readonly string[]`

Lista warningów po polsku/angielsku (mix — patrz katalog niżej). Tablica gotowa do wyświetlenia.

**Render:** lista alertów nad/pod główną rekomendacją. Każdy warning to osobny pasek (ikon + tekst).

⚠️ **NIE parsuj stringów warningów regexem w UI.** Stringi mogą się zmienić. Jeśli potrzebujesz różnych ikon/akcji per warning, dodaj mapowanie w aplikacji albo poproś o ustrukturyzowane warningi (`{ code, message }`) jako issue do biblioteki.

---

## Confidence — szczegóły UX

| confidence | n dni | α | Co user widzi |
|------------|-------|------|----------------|
| `low`      | 0–2   | 1.0 → 0.86 | Surowy baseline Galland, *"Dodaj więcej dni żeby spersonalizować"* |
| `medium`   | 3–6   | 0.79 → 0.57 | Częściowa adaptacja, brak silnego alertu |
| `high`     | 7+    | 0.50 → 0.30 (cap przy 14) | Cisza, pełne zaufanie |

Confidence to **jedyny field publiczny** powiązany z jakością danych. Nie ma `dataPoints: number` w API — jeśli potrzebujesz wyświetlić *"Masz 9 dni danych"*, policz `state.history.length` po stronie aplikacji albo użyj liczby unikalnych `sleepDayId` (zobacz `src/sleepDay.ts`).

---

## Katalog warningów

Wszystkie warningi które algorytm może wyemitować. Każdy ma trigger + co user powinien zrobić.

### 1. `'brak kotwicy czasowej (cold start bez targetWakeTime i bez historii) — nie można wyznaczyć nextSleepAt'`

**Trigger:** `morningWake === null`. Brak NIGHT-sesji kończącej się dzisiaj + brak historii z `observedMorningWake` + brak `profile.targetWakeTime`.

**UX:** Pusty stan z dwiema CTA: *"Ustaw godzinę porannej pobudki"* (otwiera ustawienia profilu) albo *"Zaloguj wczorajszą noc"*.

### 2. `'rekomendacje oparte głównie o normy wiekowe (Galland 2012) — dodaj więcej dni danych'`

**Trigger:** `confidence === 'low'` (n < 3).

**UX:** Subtelny info banner. Nie blokuj UX — to nie jest błąd, tylko status.

### 3. `'possible nap transition detected — schedule may be unstable'`

**Trigger:** mediana liczby drzemek z ostatnich 7 dni odbiega o ≥1 od `round(baseline.naps)`. Wykrywa np. tranzycję 3→2 albo 2→1.

**UX:** *"Wygląda na to że dziecko zmniejsza liczbę drzemek. Plan może być niestabilny przez najbliższe dni."*. To ważny komunikat dla rodziców — przygotowuje na fluktuacje.

### 4. `'przewlekły deficyt snu w ostatnim tygodniu'`

**Trigger:** średni `observedTotalSleep` z ostatnich 7 dni < 85% `adapted_totalSleep`.

**UX:** Czerwony banner *"Dziecko śpi mniej niż norma w ostatnim tygodniu. Skonsultuj z pediatrą jeśli stan się utrzyma."*. Flynn-Evans (2018): monitorować chronic deficit, nie acute.

### 5. `'ryzyko przemęczenia'`

**Trigger:** czas od ostatniej pobudki > 1.2 × `currentWakeWindowDuration`.

**UX:** Krótki alert *"Okno czuwania przekroczone — dziecko może być przemęczone"*. Krytyczny komunikat real-time.

### 6. `'targetWakeTime poza zakresem ±20% bezpiecznej korekty'`

**Trigger:** różnica między naturalnym bedtime a `targetWakeTime − longestSleep` przekracza 20% sumy okien aktywności.

**UX:** *"Godzina pobudki którą ustawiłeś jest za daleko od naturalnego rytmu dziecka — plan dopasowano tylko częściowo."*. Możesz zaproponować w UI wartość bliższą "naturalnej".

---

## Recipes — typowe scenariusze UX

### Recipe 1: Główny ekran "Co dalej"

```tsx
function NextSleepCard({ state, profile }: Props) {
  const rec = recommend(state, profile);

  if (rec.nextSleepAt === null) {
    return <EmptyState reason={rec.warnings[0]} />;
  }

  const minutesUntil = Math.round((rec.nextSleepAt.getTime() - state.now.getTime()) / 60_000);

  return (
    <View>
      <Text>Następny sen za {minutesUntil} min</Text>
      <Text>{rec.nextSleepAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</Text>
      <Text>Okno czuwania: {rec.currentWakeWindowDuration} min</Text>
      {rec.warnings.map((w, i) => <Warning key={i} text={w} />)}
    </View>
  );
}
```

### Recipe 2: Po dodaniu nowej sesji, przelicz natychmiast

```tsx
async function logNap(end: Date) {
  const newSession: SleepSession = {
    start: napStartedAt,         // trzymasz to w state komponentu/contextu
    end,
    type: 'NAP',
  };
  await db.insertSession(newSession);                       // persystencja
  setHistory(prev => [...prev, newSession]);                // optimistic update
  // → useEffect z [history] przeliczy `recommend` automatycznie
}
```

`recommend` jest **tanie** (<1 ms dla 14 dni × 3 sesji = 42 entries). Wołaj wprost przy każdym renderze; memo dopiero gdy zmierzysz problem.

### Recipe 3: Po wczesnej pobudce — algorytm sam to obsłuży

User loguje NIGHT kończącą się o 04:30 zamiast 06:30. **Nic specjalnego po Twojej stronie** — `resolveMorningWake` weźmie tę wartość jako `morningWake`, `forwardPass` przesunie pierwsze nap'y wcześniej, plan się przeliczy. Jedyne co możesz dodać: jeśli `rec.nextSleepAt.getHours() < 8`, pokaż dyskretną informację *"Wczesna pobudka — pierwsza drzemka też wcześniej"*.

### Recipe 4: Po pominiętej drzemce

Po prostu nie loguj jej. Algorytm zobaczy lukę w `napsDoneToday`, indeks `i` (które okno teraz) zostanie ten sam, `currentWakeWindowDuration` to dalej `wakeWindows[i]`. Warning *ryzyko przemęczenia* zapali się gdy minie 1.2× okno.

### Recipe 5: Tabela "Plan reszty dnia"

```tsx
function TodayPlan({ remainingNaps }: { remainingNaps: readonly PlanEntry[] }) {
  return (
    <FlatList
      data={remainingNaps}
      keyExtractor={(e) => e.plannedStart.toISOString()}
      renderItem={({ item }) => (
        <Row
          icon={item.type === 'NIGHT' ? 'moon' : 'sun'}
          time={fmt(item.plannedStart)}
          end={item.plannedEnd ? fmt(item.plannedEnd) : undefined}
          label={item.type === 'NIGHT' ? 'Sen nocny' : 'Drzemka'}
        />
      )}
    />
  );
}
```

---

## Persystencja — Date ↔ ISO string

Większość storage'y RN (SQLite, AsyncStorage) przyjmują tylko stringi. Konwertuj na **boundary**, nie w środku algorytmu.

```ts
// Zapis
await db.run(`INSERT INTO sessions (start, end, type) VALUES (?, ?, ?)`,
  session.start.toISOString(), session.end.toISOString(), session.type);

// Odczyt
const rows = await db.all(`SELECT start, end, type FROM sessions`);
const history: SleepSession[] = rows.map(r => ({
  start: new Date(r.start),
  end: new Date(r.end),
  type: r.type,
}));
```

`toISOString()` zwraca UTC z `Z`. `new Date(isoUtcString)` interpretuje to poprawnie i `getHours()` zwróci lokalną godzinę. To OK dopóki user nie zmienia strefy między zapisem a odczytem — wtedy lokalna interpretacja może się przesunąć (np. nocna sesja zapisana w Warszawie a interpretowana w NYC pokaże się 6h wcześniej w UI). Dla typowej app'ki na 1 dziecko = 1 user = 1 strefa to nie problem.

---

## Branded units — `Minutes`, `Hours`, `AgeMonths`, `AgeYears`

```ts
type Minutes = number & { readonly __brand: 'Minutes' };
```

W runtime to plain number. TypeScript pilnuje żebyś nie pomylił jednostek (np. nie podstawił `Hours` tam gdzie chce `Minutes`). W UI traktuj je jak number — `Math.round(rec.currentWakeWindowDuration)` działa bez konwersji.

Jeśli potrzebujesz utworzyć branded value w teście / mock'u, użyj factory z `src/index.ts`:

```ts
import { makeMinutes, makeHours } from 'sleeper-machine';
const m: Minutes = makeMinutes(45);
const h: Hours = makeHours(2.5);
```

---

## Walidacja — co algorytm sprawdza, co Ty

Algorytm na **boundary** (`recommend()`) sprawdza:
- `state.now` jest valid Date (nie `new Date(NaN)`)
- `profile.dateOfBirth` jest valid Date
- `profile.targetWakeTime.hour ∈ [0, 23]`, `minute ∈ [0, 59]`
- Każda `SleepSession.end > start`

Każdy nieprawidłowy input → `throw new Error(...)`. **Złap to** na boundary aplikacji (np. w error boundary), bo to bug w Twoim kodzie, nie user-facing problem.

**Czego algorytm NIE sprawdza** (zakłada że robisz to wcześniej):
- Czy sesje się nie nakładają (overlap między dwoma NAP)
- Czy `dateOfBirth < now`
- Czy `history` jest posortowane (kolejność nie ma znaczenia — algorytm sam grupuje)
- Czy `targetWakeTime` jest realistyczna względem wieku (np. 14:00 dla 3mo)

---

## Wydajność

Mierzone na 14 dniach historii (42 sesji) na M1 MacBook: **<1 ms na wywołanie `recommend`**. W RN spodziewaj się 1-3 ms na średnim Androidzie.

Bezpieczne wzorce:
- Wołaj w body funkcji komponentu (każdy render) — taniej niż większość selektorów Redux
- `useMemo([state.now, profile, state.history])` tylko jeśli profilujesz i widzisz wąskie gardło
- NIE call'uj w `setInterval` co sekundę — `state.now` zmienia się rzadko z punktu widzenia rekomendacji. Tickuj co 30s-1min.

---

## FAQ

**Q: Co jeśli user zaloguje sesję w przyszłości (start > now)?**
A: Algorytm nie walidu­je tego. `sleepDayBoundary` pogrupuje ją, `observedTotal*` zsumują. Możesz dostać dziwne wyniki. Waliduj na boundary UI (datepicker disabled dla przyszłych dat).

**Q: Czy mogę nadpisać `α`, `λ`, `safetyRail`?**
A: Nie publicznym API — `DEFAULT_ADAPT_OPTIONS` jest exportowane jako wartość referencyjna, ale `recommend()` nie przyjmuje opts. Jeśli chcesz custom tuning, użyj `adapt()` z `src/adaptation.ts` bezpośrednio i zbuduj własny pipeline. (Phase 9 może wprowadzić `recommend(state, profile, options)`.)

**Q: Czy `nextSleepAt` to czas snu czy czas położenia?**
A: Czas **położenia** — kiedy zacząć rytuał usypiania. Sam moment zaśnięcia jest dziecko-zależny i algorytm go nie modeluje.

**Q: Co z drzemkami w samochodzie / wózku które user zalogował?**
A: To NAP jak każda inna. Algorytm bierze pod uwagę długość i moment. Drzemki "pasywne" (samochód) statystycznie skracają następną planową drzemkę — algorytm uchwyci to przez `observedNapLengths` (Phase 9 może to wykorzystać do per-nap timing).

**Q: Czy algorytm radzi sobie z bliźniakami / wieloma dziećmi?**
A: To biblioteka per-child. Wołaj `recommend` osobno dla każdego dziecka z osobnym `ChildProfile` i `state.history`.

---

## Powiązane

- [`README.md`](./README.md) — install + opis algorytmu w 9 krokach + linki
- [`PLAN.md`](./PLAN.md) — specyfikacja merytoryczna + bibliografia + edge cases
- [`CLAUDE.md`](./CLAUDE.md) — zasady kodowania (jeśli chcesz fork'ować lub PR'ować)
- `src/types.ts` — pełna definicja typów (55 linii)
