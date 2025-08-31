// src/types/supabase.ts
// TypeScript types for Supabase tables

export type Team = {
  id: string;
  team_number: number;
  team_name: string;
  school_name?: string;
  region?: string;
  coach_email?: string;
  created_at: string;
  updated_at: string;
  total_points: number;
  games_played: number;
  average_score: number;
  team_rank: number;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'mentor' | 'coach';
  team_id: string;
  individual_points: number;
  games_played: number;
  best_score: number;
  created_at: string;
  last_active: string;
};

export type GameSession = {
  id: string;
  user_id: string;
  team_id: string;
  season: string;
  score: number;
  questions_answered: number;
  correct_answers: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  time_taken: number;
  completed_at: string;
};

export type TeamInvitation = {
  id: string;
  team_id: string;
  email: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
};
