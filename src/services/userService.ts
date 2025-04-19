
import { User, Match } from '@/types';
import { supabase } from "@/integrations/supabase/client";

// Current user session
let currentUser: User | null = null;

// In-memory storage for demo matches
let demoMatches: Match[] = [];

// Function with fixed mapping between database fields and our Match type
const mapDatabaseMatchToMatch = (match: any): Match => {
  return {
    id: match.id,
    whitePlayerId: match.white_player_id,
    blackPlayerId: match.black_player_id,
    whiteUsername: match.white_username || 'Unknown',
    blackUsername: match.black_username || 'Unknown',
    stake: match.stake_amount,
    status: match.status as 'pending' | 'active' | 'completed' | 'cancelled',
    winner: match.winner_id,
    timeControl: match.time_control?.toString() || '10',
    gameMode: match.game_mode || (parseInt(match.time_control?.toString() || '10') <= 5 ? 'blitz' : 'rapid'),
    lichessGameId: match.lichess_game_id || match.pgn,
    createdAt: match.created_at,
    updatedAt: match.updated_at || match.created_at,
    fee_accepted: match.fee_accepted || false
  };
};

export const userService = {
  // Login user
  login: async (username: string, password: string): Promise<User> => {
    try {
      // Only allow login if password is provided
      if (!password) {
        throw new Error("Password is required");
      }
      
      // Try to authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: username, // Use the email/username directly
        password: password
      });

      if (authError) throw authError;
      
      if (authData?.user) {
        // Check if the user is a demo account
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_demo, username, avatar_url')
          .eq('id', authData.user.id)
          .single();
          
        // Get wallet info
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', authData.user.id)
          .single();
          
        const user: User = {
          id: authData.user.id,
          username: profileData?.username || username,
          balance: walletData?.balance || 0,
          avatar: profileData?.avatar_url || '♟',
          email: authData.user.email
        };
          
        currentUser = user;
        return user;
      }
      
      throw new Error("Authentication failed");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const userId = session.session.user.id;
        
        // Check if the user is a demo account
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_demo, username, avatar_url')
          .eq('id', userId)
          .single();
          
        // Get wallet info
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .single();
          
        const user: User = {
          id: userId,
          username: profileData?.username || 'User',
          balance: walletData?.balance || 0,
          avatar: profileData?.avatar_url || '♟',
          email: session.session.user.email
        };
          
        currentUser = user;
        return user;
      }
    } catch (error) {
      console.error("Get current user error:", error);
    }
    
    return Promise.resolve(currentUser);
  },

  // Set current user
  setCurrentUser: (user: User): void => {
    currentUser = user;
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      currentUser = null;
      demoMatches = []; // Clear demo matches on logout
      return Promise.resolve();
    } catch (error) {
      console.error("Logout error:", error);
      return Promise.resolve();
    }
  },

  // Get user by ID
  getUserById: async (id: string): Promise<User | null> => {
    try {
      // Check if this is a demo ID
      if (id.startsWith('demo_')) {
        return currentUser && currentUser.id === id ? currentUser : null;
      }
      
      // Get user from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_demo')
        .eq('id', id)
        .single();
        
      if (profileError) throw profileError;
      
      // Get wallet info
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', id)
        .single();
        
      if (walletError) throw walletError;
      
      return {
        id,
        username: profileData.username || 'User',
        balance: walletData.balance || 0,
        avatar: profileData.avatar_url || '♟'
      };
      
    } catch (error) {
      console.error("Get user by ID error:", error);
      return null;
    }
  },

  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('is_demo', false)
        .limit(100);
        
      if (error) throw error;
      
      const users = await Promise.all(data.map(async (profile) => {
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', profile.id)
          .single();
          
        return {
          id: profile.id,
          username: profile.username || 'User',
          balance: walletData?.balance || 0,
          avatar: profile.avatar_url || '♟'
        };
      }));
      
      return users;
    } catch (error) {
      console.error("Get all users error:", error);
      return [];
    }
  },

  // Update user balance
  updateBalance: async (userId: string, amount: number): Promise<User> => {
    try {
      // Check if this is a demo ID
      if (userId.startsWith('demo_')) {
        if (currentUser && currentUser.id === userId) {
          currentUser.balance += amount;
          return currentUser;
        }
        throw new Error('Demo user not found');
      }
      
      // Update balance in Supabase
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (walletError) throw walletError;
      
      const newBalance = (walletData.balance || 0) + amount;
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletData.id);
        
      if (updateError) throw updateError;
      
      // Get updated user
      const user = await userService.getUserById(userId);
      if (!user) throw new Error('Failed to get updated user');
      
      return user;
    } catch (error) {
      console.error("Update balance error:", error);
      throw error;
    }
  },

  // Match related functions
  createMatch: async (matchData: Partial<Match>): Promise<Match> => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          white_player_id: matchData.whitePlayerId,
          black_player_id: matchData.blackPlayerId || null,
          white_username: matchData.whiteUsername,
          black_username: matchData.blackUsername || null,
          stake_amount: matchData.stake || 0,
          status: matchData.status || 'pending',
          time_control: parseInt(matchData.timeControl || '5'),
          game_mode: matchData.gameMode || 'standard'
        })
        .select('*')
        .single();

      if (error) throw error;
      
      return mapDatabaseMatchToMatch(data);
    } catch (error) {
      console.error("Create match error:", error);
      throw error;
    }
  },

  getAllMatches: async (): Promise<Match[]> => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(mapDatabaseMatchToMatch);
    } catch (error) {
      console.error("Get all matches error:", error);
      return [];
    }
  },

  getUserMatches: async (userId: string): Promise<Match[]> => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(mapDatabaseMatchToMatch);
    } catch (error) {
      console.error("Get user matches error:", error);
      return [];
    }
  },

  cancelMatch: async (matchId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId)
        .eq('status', 'pending'); // Only cancel if it's still pending
        
      if (error) throw error;
    } catch (error) {
      console.error("Cancel match error:", error);
      throw error;
    }
  },

  getMatchById: async (id: string): Promise<Match | null> => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return mapDatabaseMatchToMatch(data);
    } catch (error) {
      console.error("Get match by ID error:", error);
      return null;
    }
  },

  updateMatch: async (id: string, matchData: Partial<Match>): Promise<Match> => {
    try {
      // Convert from our Match type to database fields
      const dbData: any = {};
      
      if (matchData.blackPlayerId !== undefined) dbData.black_player_id = matchData.blackPlayerId;
      if (matchData.blackUsername !== undefined) dbData.black_username = matchData.blackUsername;
      if (matchData.status !== undefined) dbData.status = matchData.status;
      if (matchData.winner !== undefined) dbData.winner_id = matchData.winner;
      if (matchData.lichessGameId !== undefined) dbData.lichess_game_id = matchData.lichessGameId;
      
      const { data, error } = await supabase
        .from('matches')
        .update(dbData)
        .eq('id', id)
        .select('*')
        .single();
        
      if (error) throw error;
      
      return mapDatabaseMatchToMatch(data);
    } catch (error) {
      console.error("Update match error:", error);
      throw error;
    }
  },

  deleteMatch: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error("Delete match error:", error);
      throw error;
    }
  },

  joinMatch: async (matchId: string, userId: string): Promise<Match> => {
    try {
      // First get user details
      const user = await userService.getUserById(userId);
      if (!user) throw new Error("User not found");
      
      // Get the match
      const match = await userService.getMatchById(matchId);
      if (!match) throw new Error("Match not found");
      
      if (match.status !== 'pending') {
        throw new Error("Cannot join match that is not pending");
      }
      
      if (match.whitePlayerId === userId) {
        throw new Error("Cannot join your own match");
      }
      
      // Update the match with black player info and set to active
      const updatedMatch = await userService.updateMatch(matchId, {
        blackPlayerId: userId,
        blackUsername: user.username,
        status: 'active'
      });
      
      return updatedMatch;
    } catch (error) {
      console.error("Join match error:", error);
      throw error;
    }
  },

  completeMatch: async (matchId: string, winnerId: string | null): Promise<Match> => {
    try {
      const updatedMatch = await userService.updateMatch(matchId, {
        status: 'completed',
        winner: winnerId
      });
      
      return updatedMatch;
    } catch (error) {
      console.error("Complete match error:", error);
      throw error;
    }
  }
};
