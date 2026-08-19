import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Lock, GraduationCap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Syllabus+" },
      {
        name: "description",
        content: "Sign in or create an account on Syllabus+.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate(); // Correctly placed at the top level of the component
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        toast.success("Account created! Welcome to Syllabus+.");
        navigate({ to: "/research" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        toast.success("Logged in successfully!");
        navigate({ to: "/research" });
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <Card className="w-full max-w-[420px] shadow-lg">
    <CardHeader className="space-y-2 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
    <GraduationCap className="h-7 w-7" />
    </div>
    <CardTitle className="text-2xl font-semibold tracking-tight">
    Welcome to Syllabus+
    </CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
    Sign in to your university account
    </CardDescription>
    </CardHeader>

    <form onSubmit={handleSubmit}>
    <CardContent className="space-y-4">
    <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <div className="relative">
    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
    id="email"
    type="email"
    placeholder="student@university.edu"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="pl-10"
    required
    disabled={isLoading}
    />
    </div>
    </div>

    <div className="space-y-2">
    <Label htmlFor="password">Password</Label>
    <div className="relative">
    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
    id="password"
    type={showPassword ? "text" : "password"}
    placeholder="••••••••"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="pl-10 pr-10"
    required
    disabled={isLoading}
    />
    <button
    type="button"
    onClick={() => setShowPassword((s) => !s)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    aria-label={showPassword ? "Hide password" : "Show password"}
    >
    {showPassword ? (
      <EyeOff className="h-4 w-4" />
    ) : (
      <Eye className="h-4 w-4" />
    )}
    </button>
    </div>
    </div>
    </CardContent>

    <CardFooter className="flex flex-col gap-4">
    <Button type="submit" className="w-full" disabled={isLoading}>
    {isLoading
      ? "Please wait..."
      : isSignUp
      ? "Create account"
      : "Sign In"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
      {isSignUp
        ? "Already have an account?"
        : "Don't have an account?"}{" "}
        <button
        type="button"
        onClick={() => setIsSignUp((s) => !s)}
        className="font-medium text-primary hover:underline"
        >
        {isSignUp ? "Log in" : "Sign up"}
        </button>
        </p>
        </CardFooter>
        </form>
        </Card>
        </div>
  );
}
