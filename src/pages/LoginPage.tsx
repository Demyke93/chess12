
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username) {
      toast({
        title: "Error",
        description: "Please enter a username or email",
        variant: "destructive",
      });
      return;
    }
    
    if (!password) {
      toast({
        title: "Error",
        description: "Please enter a password",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Login with the provided username/email directly
      // Proper handling is now done in the userService.login method
      await login(username, password);
      navigate("/");
    } catch (error) {
      console.error("Login failed:", error);
      // Error toasts are now handled in the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md border-chess-brown/50 bg-chess-dark/90">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Login to Chess<span className="text-chess-accent">Stake</span></CardTitle>
          <CardDescription className="text-center">
            Enter your username or email and password to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  placeholder="johndoe or johndoe@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password"
                    className="text-xs text-chess-accent hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="text-xs text-gray-400">
                  Password is required for account security
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-chess-accent hover:bg-chess-accent/80 text-black"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            <span className="text-gray-400">Don't have an account? </span>
            <Link 
              to="/register"
              className="text-chess-accent hover:underline"
            >
              Sign up
            </Link>
          </div>
          <div className="text-center text-xs text-gray-400">
            <p>By logging in, you agree to our</p>
            <p>
              <a href="#" className="text-chess-accent hover:underline">Terms of Service</a>
              {" "}&{" "}
              <a href="#" className="text-chess-accent hover:underline">Privacy Policy</a>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
