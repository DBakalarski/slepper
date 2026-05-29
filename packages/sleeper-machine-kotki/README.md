# sleeper-machine-kotki

Lookup-based sleep schedule algorithm for infants and toddlers, based on the Kotki Dwa guidebook methodology.

## Philosophy

This package implements an **opinionated, age-based** approach to sleep scheduling. Unlike `sleeper-machine` (which derives wake windows from observed sleep history using Galland 2012 norms), this package uses **fixed lookup tables** keyed by the child's age in months.

The methodology comes from the Kotki Dwa sleep guide. Philosophies differ intentionally:

| | sleeper-machine (Galland) | sleeper-machine-kotki (Kotki Dwa) |
|---|---|---|
| Wake windows | Derived from history (EWMA) | Fixed per age bucket |
| Cold start | Returns null nextSleepAt + warning | Returns full schedule from wake time |
| Confidence | low → high (data-dependent) | always 'high' (deterministic) |
| Best for | Children with rich history | New users / first days / guidebook fans |

## Public API

```ts
import { recommendKotkiDwa } from 'sleeper-machine-kotki';

const result = recommendKotkiDwa(state, profile);
// result: Recommendation (same type as sleeper-machine)
```

## Types

All types (`State`, `ChildProfile`, `Recommendation`, etc.) are re-exported from `sleeper-machine`. Do not duplicate them.

## Buckets

Age ranges: `5m`, `6m-3naps`, `6m-2naps`, `7m`, `8m`, `9m`, `10m`, `11m`, `12m-2naps`, `12m-1nap`, `18m+`

The `pickBucket` function selects the appropriate bucket based on `ageMonths` and optional `preferredNapsCount` override.
