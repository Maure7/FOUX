import { appStorage } from '../services/appStorage';

export const CHALLENGE_RECORDS_KEY = 'foux_challenge_records';
// Every run is rewritten with the workspace file on desktop; keep it small.
const MAX_RUNS = 50;

const isRun = (run) => Number.isFinite(run?.ms) && run.ms > 0 && Number.isFinite(run.at);

export function readChallengeRecords() {
  try {
    const data = JSON.parse(appStorage.getItem(CHALLENGE_RECORDS_KEY) || 'null');
    const runs = Array.isArray(data?.runs) ? data.runs.filter(isRun).slice(0, MAX_RUNS) : [];
    const best = isRun(data?.best) ? { ms: data.best.ms, at: data.best.at } : null;
    return { best, runs: runs.map((run) => ({ ms: run.ms, at: run.at, record: run.record === true })) };
  } catch {
    return { best: null, runs: [] };
  }
}

/** Saves a fully completed round; partial rounds are never passed here. */
export function saveChallengeRun(ms) {
  const { best, runs } = readChallengeRecords();
  const isRecord = !best || ms < best.ms;
  const run = { ms, at: Date.now(), record: isRecord };
  const next = { best: isRecord ? { ms, at: run.at } : best, runs: [run, ...runs].slice(0, MAX_RUNS) };
  try {
    appStorage.setItem(CHALLENGE_RECORDS_KEY, JSON.stringify(next));
  } catch {
    // The result is still shown; only the history is lost when storage is blocked.
  }
  return { isRecord };
}

const pad = (value) => String(value).padStart(2, '0');
const parts = (ms) => {
  const seconds = Math.floor(ms / 1000);
  return [Math.floor(seconds / 60), seconds % 60];
};

/** "MM:SS" */
export function formatClock(ms) {
  const [minutes, seconds] = parts(Math.max(0, ms));
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** "MMm SSs" */
export function formatDuration(ms) {
  const [minutes, seconds] = parts(Math.max(0, ms));
  return `${pad(minutes)}m ${pad(seconds)}s`;
}
