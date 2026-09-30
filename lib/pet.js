// Mood of the study buddy "Byte", from the learner's day. Pure, so it can be tested.
export function petMood({ streak, activeToday, hour }) {
  if (hour >= 23 || hour < 5) return 'sleepy';
  if (!activeToday && streak > 0 && hour >= 18) return 'worried';
  if (streak >= 7) return 'proud';
  return 'happy';
}
