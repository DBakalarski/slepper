// Manual smoke test for `recommend()`. Loads a JSON fixture, iterates `now`
// every hour over 24h, and prints a table of Recommendation snapshots.
//
// Usage: pnpm smoke -- tests/fixtures/nine-month-old.json

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recommend } from '../src/recommender.ts';
import type {
  ChildProfile,
  PlanEntry,
  Recommendation,
  SleepSession,
  State,
  TimeOfDay,
} from '../src/types.ts';

type FixtureJSON = {
  readonly now: string;
  readonly profile: {
    readonly dateOfBirth: string;
    readonly targetWakeTime?: TimeOfDay;
  };
  readonly history: ReadonlyArray<{
    readonly start: string;
    readonly end: string;
    readonly type: 'NIGHT' | 'NAP';
  }>;
};

function loadFixture(path: string): { state: State; profile: ChildProfile } {
  const raw = readFileSync(resolve(path), 'utf-8');
  const json = JSON.parse(raw) as FixtureJSON;
  const history: SleepSession[] = json.history.map((s) => ({
    start: new Date(s.start),
    end: new Date(s.end),
    type: s.type,
  }));
  const state: State = { now: new Date(json.now), history };
  const profile: ChildProfile = json.profile.targetWakeTime
    ? {
        dateOfBirth: new Date(json.profile.dateOfBirth),
        targetWakeTime: json.profile.targetWakeTime,
      }
    : { dateOfBirth: new Date(json.profile.dateOfBirth) };
  return { state, profile };
}

const pad = (n: number): string => String(n).padStart(2, '0');
const fmtTime = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDateTime = (d: Date): string => `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${fmtTime(d)}`;

function fmtPlan(plan: readonly PlanEntry[]): string {
  if (plan.length === 0) return '—';
  return plan
    .map((e) => `${e.type === 'NAP' ? 'N' : 'B'}@${fmtTime(e.plannedStart)}`)
    .join(' ');
}

function printRow(now: Date, rec: Recommendation): void {
  const cols = [
    fmtTime(now).padEnd(6),
    String(Math.round(rec.currentWakeWindowDuration)).padStart(5),
    (rec.nextSleepAt ? fmtDateTime(rec.nextSleepAt) : '—').padEnd(13),
    rec.confidence.padEnd(7),
    fmtPlan(rec.remainingNapsToday).padEnd(40),
    rec.warnings.length > 0 ? `[${rec.warnings.length}] ${rec.warnings[0]!.slice(0, 50)}` : '',
  ];
  console.log(cols.join(' │ '));
}

function main(): void {
  // Skip a literal "--" if pnpm forwarded it.
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const fixturePath = args[0];
  if (!fixturePath) {
    console.error('Usage: pnpm smoke -- <path-to-fixture.json>');
    process.exit(1);
  }

  const { state, profile } = loadFixture(fixturePath);

  console.log(`Fixture: ${fixturePath}`);
  console.log(`Date of birth: ${state.now.toISOString()} (now)  |  DOB: ${profile.dateOfBirth.toISOString()}`);
  console.log(`History sessions: ${state.history.length}`);
  if (profile.targetWakeTime) {
    console.log(`Target wake: ${pad(profile.targetWakeTime.hour)}:${pad(profile.targetWakeTime.minute)}`);
  }
  console.log('');
  console.log(
    [
      'now   ',
      'wakeW',
      'nextSleepAt  ',
      'conf   ',
      'remainingPlan (N=nap, B=bedtime)        ',
      'warning',
    ].join(' │ '),
  );
  console.log('─'.repeat(120));

  // Iterate `now` every hour over 24h starting from fixture.now.
  const baseNow = state.now;
  for (let h = 0; h < 24; h++) {
    const iterNow = new Date(baseNow.getTime() + h * 3_600_000);
    const iterState: State = { now: iterNow, history: state.history };
    const rec = recommend(iterState, profile);
    printRow(iterNow, rec);
  }
}

main();
