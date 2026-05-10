export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_points: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_quiz_date: string | null;
  is_premium: boolean;
  monthly_quiz_count: number;
  monthly_reset_date: string | null;
  created_at: string;
  updated_at: string;
}
