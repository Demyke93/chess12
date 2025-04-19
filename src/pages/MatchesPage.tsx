import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Match } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const MatchesPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: () => userService.getAllMatches(),
  });

  const { data: userMatches = [] } = useQuery({
    queryKey: ["userMatches"],
    queryFn: () => (user ? userService.getUserMatches(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const filterMatches = (matchList: Match[]) => {
    return matchList.filter((match) => {
      if (statusFilter !== "all" && match.status !== statusFilter) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          match.whiteUsername.toLowerCase().includes(query) ||
          match.blackUsername.toLowerCase().includes(query) ||
          match.gameMode.toLowerCase().includes(query) ||
          match.timeControl.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  const handleViewDetails = (match: Match) => {
    setSelectedMatch(match);
    setIsDetailsOpen(true);
  };

  const handleJoinMatch = (match: Match) => {
    navigate(`/match/${match.id}`);
  };

  const handleCreateMatch = () => {
    navigate("/create-match");
  };

  const handleCancelMatch = async (match: Match) => {
    try {
      await userService.cancelMatch(match.id);
      toast({
        title: "Match Cancelled",
        description: "Your match has been cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["userMatches"] });
    } catch (error) {
      console.error("Failed to cancel match:", error);
      toast({
        title: "Error",
        description: "Failed to cancel match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredAllMatches = filterMatches(matches);
  const filteredUserMatches = filterMatches(userMatches);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Chess Matches</h1>
        <Button onClick={handleCreateMatch} className="bg-chess-accent hover:bg-chess-accent/80 text-black">
          <Plus className="mr-2 h-4 w-4" /> Create Match
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search by player, game mode..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Matches</TabsTrigger>
          <TabsTrigger value="my" disabled={!user}>
            My Matches
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-pulse-gold text-chess-accent">Loading matches...</div>
            </div>
          ) : filteredAllMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No matches found. Try adjusting your filters or create a new match.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAllMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onViewDetails={handleViewDetails}
                  onJoinMatch={handleJoinMatch}
                  onCancelMatch={handleCancelMatch}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="my" className="mt-6">
          {!user ? (
            <div className="text-center py-8 text-gray-400">
              Please login to view your matches.
            </div>
          ) : filteredUserMatches.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              You haven't participated in any matches yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUserMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onViewDetails={handleViewDetails}
                  onJoinMatch={handleJoinMatch}
                  onCancelMatch={handleCancelMatch}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-chess-dark border-chess-brown text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Match Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedMatch?.whiteUsername} vs {selectedMatch?.blackUsername}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-chess-accent">White</h3>
                  <p>{selectedMatch.whiteUsername}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Black</h3>
                  <p>{selectedMatch.blackUsername}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Stake</h3>
                  <p>{selectedMatch.stake} coins</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Time Control</h3>
                  <p>{selectedMatch.timeControl}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Game Mode</h3>
                  <p>{selectedMatch.gameMode}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-chess-accent">Status</h3>
                  <p className="capitalize">{selectedMatch.status}</p>
                </div>
              </div>
              
              {selectedMatch.status === 'completed' && selectedMatch.winner && (
                <div className="mt-4 p-3 bg-chess-dark rounded-md border border-chess-brown/50">
                  <h3 className="font-semibold text-chess-accent">Result</h3>
                  <p>
                    Winner: {selectedMatch.winner === selectedMatch.whitePlayerId 
                      ? selectedMatch.whiteUsername 
                      : selectedMatch.blackUsername}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end mt-4">
                {selectedMatch.status === 'pending' && user && 
                 selectedMatch.whitePlayerId !== user.id && 
                 selectedMatch.blackPlayerId !== user.id && (
                  <Button 
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleJoinMatch(selectedMatch);
                    }}
                    className="bg-chess-accent hover:bg-chess-accent/80 text-black"
                  >
                    Join Match
                  </Button>
                )}
                
                {selectedMatch.status === 'active' && 
                 ((user?.id === selectedMatch.whitePlayerId) || 
                  (user?.id === selectedMatch.blackPlayerId)) && (
                  <Button 
                    onClick={() => {
                      setIsDetailsOpen(false);
                      navigate(`/match/${selectedMatch.id}`);
                    }}
                    className="bg-chess-accent hover:bg-chess-accent/80 text-black"
                  >
                    Play Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatchesPage;
