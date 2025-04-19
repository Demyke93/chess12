export interface User {
  id: string;
  username: string;
  balance: number;
  avatar?: string;
  email?: string;
}

export interface Match {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername: string;
  blackUsername: string;
  stake: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  winner?: string;
  timeControl: string;
  gameMode: string;
  lichessGameId?: string;
  createdAt: string;
  updatedAt: string;
  fee_accepted?: boolean;
}

export interface StakeSettings {
  amount: number;
  timeControl: string;
  gameMode: string;
}

export interface LichessUserProfile {
  id: string;
  username: string;
  perfs: {
    [key: string]: {
      games: number;
      rating: number;
      rd: number;
      prog: number;
    };
  };
  createdAt: number;
  profile?: {
    country?: string;
    bio?: string;
    firstName?: string;
    lastName?: string;
  };
}

export type GameResult = 'win' | 'loss' | 'draw' | 'ongoing';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
  is_demo?: boolean;
}

export interface DatabaseMatch {
  id: string;
  white_player_id: string;
  black_player_id: string;
  white_username: string | null;
  black_username: string | null;
  stake_amount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  time_control: number;
  game_mode: string;
  pgn: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  winner_id: string | null;
  fee_accepted: boolean;
}
