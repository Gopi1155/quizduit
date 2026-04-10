export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  photoURL?: string;
  totalScore: number;
  createdAt: any;
  progress: Record<string, number>; // subjectId -> highest level completed
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  subjectId: string;
  level: number;
  round: 1 | 2 | 3;
}

export interface Result {
  id: string;
  userId: string;
  username: string;
  subjectId: string;
  subjectName: string;
  level: number;
  round: 1 | 2 | 3;
  score: number;
  timestamp: any;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  photoURL?: string;
  score: number;
  lastUpdated: any;
}
