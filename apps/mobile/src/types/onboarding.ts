export type OnboardingStep = 'GENDER' | 'BIRTHDAY' | 'METRICS' | 'GOAL' | 'LEVEL' | 'SUCCESS';

export interface OnboardingData {
  gender: 'male' | 'female' | null;
  birthday: string;
  height: number;
  weight: number;
  goal: string | null;
  level: string | null;
}

export interface GoalOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconType: 'ionicons' | 'mcm';
  color: string;
}

export interface LevelOption {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  intensity: number;
}
