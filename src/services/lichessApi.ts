
import { LichessUserProfile } from '@/types';

// Lichess API endpoints
const API_BASE_URL = 'https://lichess.org/api';

// This is a mock implementation as we don't have real OAuth flow in this demo
let authToken: string | null = null;

export const lichessApi = {
  setAuthToken: (token: string) => {
    authToken = token;
  },

  getAuthToken: () => {
    return authToken;
  },

  clearAuthToken: () => {
    authToken = null;
  },

  isAuthenticated: () => {
    return !!authToken;
  },

  // Mock authentication for demo purposes
  mockAuthenticate: (username: string): Promise<{ token: string, user: { id: string, username: string } }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockToken = `mock_token_${Math.random().toString(36).substr(2, 9)}`;
        authToken = mockToken;
        
        resolve({
          token: mockToken,
          user: {
            id: `user_${Math.random().toString(36).substr(2, 9)}`,
            username: username
          }
        });
      }, 500);
    });
  },

  // In a real app, this would use the Lichess OAuth flow
  // https://lichess.org/api#tag/Account
  getUserProfile: async (): Promise<LichessUserProfile> => {
    if (!authToken) {
      throw new Error('Authentication required');
    }

    // In a real implementation, you would fetch from the Lichess API
    // const response = await fetch(`${API_BASE_URL}/account`, {
    //   headers: {
    //     'Authorization': `Bearer ${authToken}`
    //   }
    // });
    // return await response.json();

    // For demo purposes, return mock data
    return {
      id: "mock_user_id",
      username: "ChessPlayer1",
      perfs: {
        blitz: {
          games: 132,
          rating: 1624,
          rd: 75,
          prog: -13
        },
        rapid: {
          games: 56,
          rating: 1700,
          rd: 80,
          prog: 20
        }
      },
      createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      profile: {
        country: "US",
        bio: "Chess enthusiast"
      }
    };
  },

  // Create a challenge link
  // In a real app, this would create a real challenge via Lichess API
  createChallenge: async (opponent: string, timeControl: string, mode: string): Promise<string> => {
    if (!authToken) {
      throw new Error('Authentication required');
    }
    
    // For demo purposes, return a mock game ID
    const mockGameId = Math.random().toString(36).substr(2, 9);
    return mockGameId;
  },

  // Get game result - in a real app, this would poll the Lichess API for the game result
  getGameResult: async (gameId: string): Promise<'win' | 'loss' | 'draw' | 'ongoing'> => {
    // For demo purposes, return a random result
    const results: ('win' | 'loss' | 'draw')[] = ['win', 'loss', 'draw'];
    return results[Math.floor(Math.random() * results.length)];
  }
};
