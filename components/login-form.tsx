"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }
      router.push("/dashboard/members");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/dashboard/members`,
        },
      });
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }
      setSignupSuccess(true);
      setIsLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-4 pb-2">
          <div className="mx-auto">
            <Image
              src="/images/logo.png"
              alt="Coco Gym Fitness logo"
              width={72}
              height={72}
              className="rounded-full"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Coco Gym Fitness</h1>
            <p className="text-xs text-muted-foreground">Playas del Coco</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Check your email to confirm your account, then come back to log in.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSignupSuccess(false);
              setMode("login");
              setPassword("");
            }}
          >
            Back to login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader className="space-y-4 pb-2">
        <div className="mx-auto">
          <Image
            src="/images/logo.png"
            alt="Coco Gym Fitness logo"
            width={72}
            height={72}
            className="rounded-full"
          />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Coco Gym Fitness</h1>
          <p className="text-xs text-muted-foreground">Playas del Coco</p>
        </div>
        <CardTitle className="text-center text-lg font-medium">
          {mode === "login" ? "Sign in" : "Create account"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Login"
                : "Sign up"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {"Don't have an account? "}
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
