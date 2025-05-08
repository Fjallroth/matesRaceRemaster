import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Login: React.FC = () => {
  const handleStravaLogin = () => {
    // Redirect to your backend's Strava OAuth endpoint
    window.location.href = "https://your-backend-domain.com/oauth/strava";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">MatesRace</h1>
          <p className="text-muted-foreground mt-2">
            Race your mates, conquer the segments!
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              Log in via Strava
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4">

            <Button
              variant="outline"
              onClick={handleStravaLogin}
              className="w-full"
            >
              <img
                src="https://static-00.iconduck.com/assets.00/strava-icon-2048x2048-4fppqh38.png"
                alt="Strava"
                className="w-4 h-4 mr-2"
              />
              Connect with Strava
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>By continuing, you agree to our</p>
              <div className="flex gap-1 justify-center">
                <a href="#" className="text-primary hover:underline">
                  Terms of Service
                </a>
                <span>&</span>
                <a href="#" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
