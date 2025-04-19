
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-chess-dark">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-chess-accent mb-4">404</h1>
        <p className="text-xl text-white mb-8">Oops! This move isn't in our playbook.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/">
            <Button className="bg-chess-accent hover:bg-chess-accent/80 text-black">
              Return to Home
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="outline" className="border-chess-accent text-chess-accent hover:bg-chess-accent/10">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
