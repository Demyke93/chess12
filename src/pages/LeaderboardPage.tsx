
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const LeaderboardPage = () => {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => userService.getAllUsers(),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: () => userService.getAllMatches(),
  });

  // Calculate stats for each user
  const leaderboardData = users.map(user => {
    const userMatches = matches.filter(
      match => match.whitePlayerId === user.id || match.blackPlayerId === user.id
    );
    
    const wins = userMatches.filter(
      match => match.status === 'completed' && match.winner === user.id
    ).length;
    
    const losses = userMatches.filter(
      match => match.status === 'completed' && match.winner && match.winner !== user.id
    ).length;
    
    const totalMatches = userMatches.length;
    const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(1) : '0';
    
    return {
      ...user,
      wins,
      losses,
      totalMatches,
      winRate
    };
  });
  
  // Sort users by balance (you could add more complex ranking logic)
  const sortedLeaderboard = [...leaderboardData].sort((a, b) => b.balance - a.balance);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
      
      <Card className="border-chess-brown/50 bg-chess-dark/90">
        <CardHeader>
          <CardTitle>Top Players</CardTitle>
          <CardDescription>
            Players ranked by coin balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-gold text-chess-accent">Loading leaderboard...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-chess-brown/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Player</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">W/L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-chess-brown/30">
                  {sortedLeaderboard.map((user, index) => (
                    <tr key={user.id} className={index < 3 ? "bg-chess-dark/50" : ""}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && <Trophy className="h-5 w-5 text-yellow-500 mr-1" />}
                          {index === 1 && <Trophy className="h-5 w-5 text-gray-400 mr-1" />}
                          {index === 2 && <Trophy className="h-5 w-5 text-amber-700 mr-1" />}
                          {index > 2 && <span className="text-gray-400">{index + 1}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-chess-brown/50 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            <span className="text-white">{user.avatar || '♟'}</span>
                          </div>
                          <div className="text-sm font-medium text-white">{user.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-chess-accent font-mono">
                        {user.balance} coins
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <span className="text-chess-win">{user.wins}</span>
                        {" / "}
                        <span className="text-chess-loss">{user.losses}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        {user.winRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardPage;
