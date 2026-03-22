"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        trackEvent("auth_login_failed", {
          error_message: error.message,
        });
        setError(error.message);
        setIsLoading(false);
        return;
      }
      trackEvent("auth_login_succeeded");
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
        trackEvent("auth_signup_failed", {
          error_message: error.message,
        });
        setError(error.message);
        setIsLoading(false);
        return;
      }
      trackEvent("auth_signup_succeeded");
      setSignupSuccess(true);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);

    if (!email) {
      trackEvent("auth_password_reset_blocked", {
        reason: "missing_email",
      });
      setError("Enter your email first to receive a reset link.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        process.env.NEXT_PUBLIC_PASSWORD_RESET_REDIRECT_URL ||
        `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      trackEvent("auth_password_reset_failed", {
        error_message: error.message,
      });
      setError(error.message);
      return;
    }

    trackEvent("auth_password_reset_requested");
    setInfo("We sent you a password reset link. Check your inbox.");
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
              trackEvent("auth_mode_switched", { mode: "login" });
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
          {info && (
            <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              {info}
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
          {mode === "login" && (
            <Button
              type="button"
              variant="link"
              className="h-auto w-full p-0 text-sm"
              disabled={isLoading}
              onClick={handleForgotPassword}
            >
              Forgot your password?
            </Button>
          )}
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {"Don't have an account? "}
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  onClick={() => {
                    trackEvent("auth_mode_switched", { mode: "signup" });
                    setMode("signup");
                    setError(null);
                    setInfo(null);
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
                    trackEvent("auth_mode_switched", { mode: "login" });
                    setMode("login");
                    setError(null);
                    setInfo(null);
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
