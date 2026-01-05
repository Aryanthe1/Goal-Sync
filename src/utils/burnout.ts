export interface BurnoutMetrics {
  stress_level: number; // 1-5
  sleep_hours: number; // 0-12+
  mood_level: number; // 1-5
  time_spent_hours: number; // 0-24
}

export function calculateBurnoutScore(metrics: BurnoutMetrics): number {
  const { stress_level, sleep_hours, mood_level, time_spent_hours } = metrics;
  
  // Normalize stress (1-5 -> 0-10 scale, inverted so higher stress = higher score)
  const stressScore = ((stress_level - 1) / 4) * 4; // 0-4 range
  
  // Normalize sleep (optimal 7-9 hours, penalize too little or too much)
  let sleepScore = 0;
  if (sleep_hours < 6) {
    sleepScore = 3 - (sleep_hours / 6) * 3; // 3-0 for 0-6 hours
  } else if (sleep_hours > 9) {
    sleepScore = Math.min(2, (sleep_hours - 9) * 0.5); // Penalty for oversleep
  }
  
  // Normalize mood (1-5 -> 0-3 scale, inverted so lower mood = higher score)
  const moodScore = ((5 - mood_level) / 4) * 3; // 0-3 range
  
  // Normalize time spent (penalize excessive work hours)
  let timeScore = 0;
  if (time_spent_hours > 8) {
    timeScore = Math.min(3, (time_spent_hours - 8) * 0.3); // Up to 3 points for overwork
  }
  
  // Calculate total burnout score (0-10)
  const totalScore = stressScore + sleepScore + moodScore + timeScore;
  
  // Ensure score is within 0-10 range
  return Math.round(Math.min(10, Math.max(0, totalScore)) * 10) / 10;
}

export function getBurnoutLevel(score: number): {
  level: 'low' | 'moderate' | 'high';
  color: string;
  bgColor: string;
  message: string;
} {
  if (score <= 3) {
    return {
      level: 'low',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
      message: 'You\'re doing great! Keep up the healthy habits.'
    };
  } else if (score <= 6) {
    return {
      level: 'moderate',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
      message: 'Consider taking some time to recharge and relax.'
    };
  } else {
    return {
      level: 'high',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      message: 'High burnout detected. Please prioritize rest and self-care.'
    };
  }
}

export function getAdaptiveGoalSuggestion(burnoutScore: number): string {
  if (burnoutScore >= 7) {
    return 'Consider reducing your weekly goals by 30-50% to focus on recovery.';
  } else if (burnoutScore >= 4) {
    return 'You might want to maintain current goals but add more rest periods.';
  }
  return 'Your burnout levels look healthy - you can maintain or slightly increase your goals.';
}