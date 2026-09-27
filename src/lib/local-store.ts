export type PersistedState = {
  completedMeds: string[];
  vomitedMeds: string[];
  checkInDone: boolean;
  reminders: { medication: boolean; review: boolean; checkin: boolean };
};

export const defaults: PersistedState = {
  completedMeds: [], vomitedMeds: [], checkInDone: false, reminders: { medication: true, review: true, checkin: true },
};

export function loadState(): PersistedState {
  if (typeof window === 'undefined') return defaults;
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('petcare-state') || '{}') }; } catch { return defaults; }
}

export function saveState(state: PersistedState) {
  localStorage.setItem('petcare-state', JSON.stringify(state));
}
