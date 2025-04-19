
import { User, Match } from '@/types';

export interface UserService {
  login: (username: string, password: string) => Promise<User>;
  getCurrentUser: () => Promise<User | null>;
  setCurrentUser: (user: User) => void;
  logout: () => Promise<void>;
  getUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  updateBalance: (userId: string, amount: number) => Promise<User>;
}

export interface MatchService {
  createMatch: (match: Partial<Match>) => Promise<Match>;
  getAllMatches: () => Promise<Match[]>;
  getUserMatches: (userId: string) => Promise<Match[]>;
  getMatchById: (id: string) => Promise<Match | null>;
  updateMatch: (id: string, data: Partial<Match>) => Promise<Match>;
  deleteMatch: (id: string) => Promise<void>;
  cancelMatch: (id: string) => Promise<void>;
  joinMatch: (matchId: string, userId: string) => Promise<Match>;
  completeMatch: (matchId: string, winnerId: string | null) => Promise<Match>;
}
