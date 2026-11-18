export const FOLDER_COLORS = [
  { key: 'gold', value: '#e59843' },
  { key: 'red', value: '#ef4444' },
  { key: 'green', value: '#22c55e' },
  { key: 'blue', value: '#3b82f6' },
  { key: 'purple', value: '#a855f7' },
  { key: 'pink', value: '#ec4899' },
  { key: 'cyan', value: '#06b6d4' },
  { key: 'orange', value: '#f97316' },
];

export const DEFAULT_FOLDER_COLOR = FOLDER_COLORS[0].value;

export const isFavorite = (item) => !!(item?.favorite || item?.isFavorite);
