import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/MatchCard";
import { ChessBoard } from "@/components/ChessBoard";
import { supabase } from "@/integrations/supabase/client";
import { matchService } from '@/services/matchService';

export const HomePage = () => {
  const { user } = useAuth();
  
  const { data: recentMatches } = useQuery({
    queryKey: ["recentMatches", user?.id],
    queryFn: async () => {
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_demo')
          .eq('id', user.id)
          .single();
          
        const isDemo = profileData?.is_demo;
        
        if (isDemo) {
          return matchService.getAllMatches();
        } else {
          return matchService.getUserMatches(user.id);
        }
      }
      return [];
    },
    enabled: !!user
  });
  
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="py-12 px-4 text-center relative">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            Chess with <span className="text-chess-accent">Stakes</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Play chess matches with virtual currency stakes. Challenge opponents, 
            set your stakes, and win coins in this exciting Lichess-powered platform.
          </p>
          
          {!user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/login">
                <Button size="lg" className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                  Login to Play
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="border-chess-accent text-chess-accent">
                  Create Account
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/create-match">
                <Button size="lg" className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                  Create a Match
                </Button>
              </Link>
              <Link to="/matches">
                <Button size="lg" variant="outline" className="border-chess-accent text-chess-accent">
                  Browse Matches
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-white">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-chess-dark border-chess-brown/50">
              <CardHeader>
                <CardTitle className="text-chess-accent">Set Stakes</CardTitle>
                <CardDescription>
                  Choose how many coins to wager on your chess match
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Set your preferred stake amount, time control, and game mode for each match.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-chess-dark border-chess-brown/50">
              <CardHeader>
                <CardTitle className="text-chess-accent">Play Chess</CardTitle>
                <CardDescription>
                  Play your match using Lichess's reliable chess platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Challenge opponents directly or join open matches. Play your game on Lichess 
                  with your preferred settings.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-chess-dark border-chess-brown/50">
              <CardHeader>
                <CardTitle className="text-chess-accent">Win Coins</CardTitle>
                <CardDescription>
                  Winners take the stakes from their matches
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  When you win, your account is automatically credited with the match stake amount.
                  Climb the leaderboard with your earnings!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Recent Matches Section */}
      {user && recentMatches && recentMatches.length > 0 && (
        <section className="py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Matches</h2>
              <Link to="/matches" className="text-chess-accent hover:underline">
                View All
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Chess Board Demo */}
      {!user && (
        <section className="py-10">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6 text-white">Ready to Play?</h2>
            <div className="mb-6">
              <ChessBoard />
            </div>
            <div className="text-center">
              <Link to="/login">
                <Button size="lg" className="bg-chess-accent hover:bg-chess-accent/80 text-black">
                  Start Playing Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
