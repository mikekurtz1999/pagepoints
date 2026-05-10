import { supabase } from './supabase';

export interface AddPointsResult {
  newTotal: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}

/**
 * Awards points to a user via the Supabase RPC `add_points`.
 * The RPC is atomic — it inserts to point_transactions, updates profiles.total_points,
 * and bumps current_level if the user crossed a threshold.
 */
export async function awardQuizPoints(params: {
  userId: string;
  attemptId: string;
  points: number;
}): Promise<AddPointsResult> {
  const { userId, attemptId, points } = params;

  const { data, error } = await supabase.rpc('add_points', {
    p_user_id: userId,
    p_points: points,
    p_reason: 'quiz_completion',
    p_reference_id: attemptId,
  });

  if (error) throw new Error(`Could not award points: ${error.message}`);

  const payload = (data ?? {}) as {
    new_total?: number;
    old_level?: number;
    new_level?: number;
    leveled_up?: boolean;
  };

  return {
    newTotal: payload.new_total ?? 0,
    oldLevel: payload.old_level ?? 1,
    newLevel: payload.new_level ?? 1,
    leveledUp: payload.leveled_up ?? false,
  };
}
