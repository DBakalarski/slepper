import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChildProfile, SleepSession, State, TimeOfDay } from '../../src/types.js';

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

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name: string): { state: State; profile: ChildProfile } {
  const raw = readFileSync(resolve(__dirname, `${name}.json`), 'utf-8');
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
