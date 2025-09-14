export type ChallengeType = 'points' | 'time' | 'combo_time' | 'objects_cut'

export interface Challenge {
  id: ChallengeType
  name: string
  description: string
  better: 'higher' | 'lower'
}

export const challenges: Record<string, Challenge> = {
  mon: {
    id: 'points',
    name: 'Shuriken Showdown',
    description: 'Slice fast and rack up the highest score!',
    better: 'higher',
  },
  tue: {
    id: 'time',
    name: 'Shadow Survival',
    description: 'Stay alive as long as you can.',
    better: 'higher',
  },
  wed: {
    id: 'combo_time',
    name: 'Combo Endurance',
    description: 'Keep your strikes chained for the longest duration.',
    better: 'higher',
  },
  thu: {
    id: 'combo_time',
    name: 'Rapid Strike Master',
    description: 'Maintain combo streaks efficiently over time.',
    better: 'higher',
  },
  fri: {
    id: 'objects_cut',
    name: 'Blade Frenzy',
    description: 'Slice as many objects as possible with precision.',
    better: 'higher',
  },
  sat: {
    id: 'time',
    name: 'Ninja Marathon',
    description: 'Test your survival skills to the max.',
    better: 'higher',
  },
  sun: {
    id: 'points',
    name: 'Final Strike',
    description: 'Push for the ultimate score before the week ends!',
    better: 'higher',
  },
}