import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchCard } from "@/components/MatchCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Match } from "@/types";
import { matchService } from '@/services/matchService';

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDemo, setIsDemo] = useState<boolean | null>(null);

  // Redirect if not logged in
  if (!user) {
    navigate("/login");
    return null;
  }

  // Check if the account is a demo account
  useEffect(() => {
    const checkDemoStatus = async () => {
      try {
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_demo')
            .eq('id', user.id)
            .single();
            
          setIsDemo(profileData?.is_demo || false);
        }
      } catch (error) {
        console.error("Error checking demo status:", error);
        setIsDemo(false);
      }
    };
    
    checkDemoStatus();
  }, [user]);

  const { data: fetchedMatches = [] } = useQuery({
    queryKey: ["userMatches", user.id, isDemo],
    queryFn: async () => {
      if (isDemo === true) {
        return matchService.getUserMatches(user.id);
      } else if (isDemo === false) {
        return matchService.getUserMatches(user.id);
      }
      return [];
    },
    enabled: !!user && isDemo !== null
  });

  // Ensure matches is of type Match[]
  const matches: Match[] = fetchedMatches as Match[];

  // Calculate stats
  const completedMatches = matches.filter(match => match.status === 'completed');
  const wins = completedMatches.filter(match => match.winner === user.id).length;
  const losses = completedMatches.filter(match => match.winner && match.winner !== user.id).length;
  const draws = completedMatches.filter(match => !match.winner).length;
  const winRate = completedMatches.length > 0 
    ? ((wins / completedMatches.length) * 100).toFixed(1) 
    : '0';

  // Filter matches by status
  const activeMatches = matches.filter(match => match.status === 'active');
  const pendingMatches = matches.filter(match => match.status === 'pending');
  const matchHistory = matches.filter(match => match.status === 'completed');

  const handleViewDetails = (match: Match) => {
    navigate(`/match/${match.id}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* User Profile Card */}
        <Card className="w-full md:w-1/3 border-chess-brown/50 bg-chess-dark/90">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">{user.username}</CardTitle>
              <CardDescription>Player Profile {isDemo && '(Demo Account)'}</CardDescription>
            </div>
            <Avatar className="h-16 w-16 bg-chess-brown text-2xl">
              <AvatarFallback>{user.avatar || '♟'}</AvatarFallback>
            </Avatar>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-chess-dark/50 p-4 rounded-md text-center">
                  <div className="text-chess-accent text-2xl font-bold">{user.balance}</div>
                  <div className="text-gray-400 text-sm">Coins</div>
                </div>
                <div className="bg-chess-dark/50 p-4 rounded-md text-center">
                  <div className="text-white text-2xl font-bold">{matches.length}</div>
                  <div className="text-gray-400 text-sm">Total Matches</div>
                </div>
              </div>
              
              <div className="bg-chess-dark/50 p-4 rounded-md">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Record</h3>
                <div className="flex justify-between">
                  <div className="text-center">
                    <div className="text-chess-win font-bold">{wins}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-chess-loss font-bold">{losses}</div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-300 font-bold">{draws}</div>
                    <div className="text-xs text-gray-400">Draws</div>
                  </div>
                  <div className="text-center">
                    <div className="text-chess-accent font-bold">{winRate}%</div>
                    <div className="text-xs text-gray-400">Win Rate</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Match Status</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-amber-600/20 text-amber-500 hover:bg-amber-600/30">
                    {pendingMatches.length} Pending
                  </Badge>
                  <Badge variant="outline" className="bg-blue-600/20 text-blue-500 hover:bg-blue-600/30">
                    {activeMatches.length} Active
                  </Badge>
                  <Badge variant="outline" className="bg-gray-600/20 text-gray-400 hover:bg-gray-600/30">
                    {matchHistory.length} Completed
                  </Badge>
                </div>
              </div>
              
              {isDemo && (
                <div className="bg-amber-500/20 p-3 rounded-md border border-amber-500/30">
                  <p className="text-amber-300 text-sm">This is a demo account. Some features may be limited.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Match History */}
        <div className="w-full md:w-2/3">
          <Card className="border-chess-brown/50 bg-chess-dark/90">
            <CardHeader>
              <CardTitle>Your Matches</CardTitle>
              <CardDescription>
                View your match history and active games
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="completed">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4 space-y-4">
                  {matches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You haven't played any matches yet.
                    </div>
                  ) : (
                    matches.slice(0, 5).map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onViewDetails={handleViewDetails}
                      />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="active" className="mt-4 space-y-4">
                  {activeMatches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You don't have any active matches.
                    </div>
                  ) : (
                    activeMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onViewDetails={handleViewDetails}
                      />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="pending" className="mt-4 space-y-4">
                  {pendingMatches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You don't have any pending matches.
                    </div>
                  ) : (
                    pendingMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onViewDetails={handleViewDetails}
                      />
                    ))
                  )}
                </TabsContent>
                
                <TabsContent value="completed" className="mt-4 space-y-4">
                  {matchHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      You haven't completed any matches yet.
                    </div>
                  ) : (
                    matchHistory.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        onViewDetails={handleViewDetails}
                      />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
