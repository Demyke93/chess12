
import { Match, DatabaseMatch } from '@/types';
import { supabase } from "@/integrations/supabase/client";

export const matchService = {
  getAllMatches: async (): Promise<Match[]> => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((match: DatabaseMatch): Match => ({
      id: match.id,
      whitePlayerId: match.white_player_id,
      blackPlayerId: match.black_player_id,
      whiteUsername: match.white_username || 'Unknown',
      blackUsername: match.black_username || 'Unknown',
      stake: match.stake_amount,
      status: match.status,
      timeControl: match.time_control.toString(),
      gameMode: match.time_control <= 5 ? 'blitz' : 'rapid',
      lichessGameId: match.pgn,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
      winner: match.winner_id,
      fee_accepted: match.fee_accepted
    }));
  },

  getUserMatches: async (userId: string): Promise<Match[]> => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((match: DatabaseMatch): Match => ({
      id: match.id,
      whitePlayerId: match.white_player_id,
      blackPlayerId: match.black_player_id,
      whiteUsername: match.white_username || 'Unknown',
      blackUsername: match.black_username || 'Unknown',
      stake: match.stake_amount,
      status: match.status,
      timeControl: match.time_control.toString(),
      gameMode: match.time_control <= 5 ? 'blitz' : 'rapid',
      lichessGameId: match.pgn,
      createdAt: match.created_at,
      updatedAt: match.updated_at,
      winner: match.winner_id,
      fee_accepted: match.fee_accepted
    }));
  }
};
