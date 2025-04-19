
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { Menu, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Get first letter of username for avatar fallback
  const getInitials = (username: string) => {
    return username?.charAt(0).toUpperCase() || '♟';
  };

  return (
    <nav className="bg-chess-dark border-b border-chess-brown py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl text-chess-accent font-bold">♔ ChessStake</span>
        </Link>
        
        <button 
          className="md:hidden text-white"
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-white hover:text-chess-accent transition-colors">
            Home
          </Link>
          <Link to="/matches" className="text-white hover:text-chess-accent transition-colors">
            Matches
          </Link>
          <Link to="/leaderboard" className="text-white hover:text-chess-accent transition-colors">
            Leaderboard
          </Link>
          <Link to="/wallet" className="text-white hover:text-chess-accent transition-colors">
            Wallet
          </Link>
          
          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/profile" className="flex items-center">
                <Avatar className="w-8 h-8 mr-2 bg-chess-brown">
                  {user.avatar && user.avatar.startsWith('http') ? (
                    <AvatarImage src={user.avatar} alt={user.username} />
                  ) : (
                    <AvatarFallback className="bg-chess-brown text-white">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-white">{user.username}</span>
                  <span className="text-chess-accent">{user.balance} coins</span>
                </div>
              </Link>
              <Button variant="outline" onClick={() => logout()}>
                Logout
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="default">Login</Button>
            </Link>
          )}
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div className="md:hidden bg-chess-dark mt-2 px-4 py-2 border-t border-chess-brown">
          <Link to="/" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Home
          </Link>
          <Link to="/matches" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Matches
          </Link>
          <Link to="/leaderboard" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Leaderboard
          </Link>
          <Link to="/wallet" className="block py-2 text-white hover:text-chess-accent" onClick={toggleMobileMenu}>
            Wallet
          </Link>
          
          {user ? (
            <div className="py-2">
              <Link to="/profile" className="flex items-center py-2" onClick={toggleMobileMenu}>
                <Avatar className="w-8 h-8 mr-2 bg-chess-brown">
                  {user.avatar && user.avatar.startsWith('http') ? (
                    <AvatarImage src={user.avatar} alt={user.username} />
                  ) : (
                    <AvatarFallback className="bg-chess-brown text-white">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <div className="text-white">{user.username}</div>
                  <div className="text-chess-accent">{user.balance} coins</div>
                </div>
              </Link>
              <Button variant="outline" onClick={() => { logout(); toggleMobileMenu(); }} className="w-full mt-2">
                Logout
              </Button>
            </div>
          ) : (
            <Link to="/login" onClick={toggleMobileMenu} className="block py-2">
              <Button variant="default" className="w-full">Login</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};
