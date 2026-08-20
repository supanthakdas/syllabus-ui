import { createFileRoute } from "@tanstack/react-router";
import {
  Upload,
  FileText,
  BookOpen,
  HelpCircle,
  Sparkles,
  Check,
  X,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study-companion")({
  head: () => ({
    meta: [
      { title: "Study Companion — Syllabus+" },
      { name: "description", content: "Upload your syllabus or reading materials to get curated resources and AI-generated quizzes on Syllabus+." },
      { property: "og:title", content: "Study Companion — Syllabus+" },
      { property: "og:description", content: "Upload your syllabus or reading materials to get curated resources and AI-generated quizzes on Syllabus+." },
    ],
  }),
  component: StudyCompanionPage,
});

interface QuizQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface StudySession {
  id: number | string;
  topics: string[];
}

function normalizeTopics(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      /* fall through to comma split */
    }
    return raw.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function StudyCompanionPage() {
  // Latest study session provides the topics used for the quiz.
  const sessionQuery = useQuery<StudySession | null>({
    queryKey: ["latest-study-session"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      return { id: row.id, topics: normalizeTopics(row.topics) };
    },
  });

  const session = sessionQuery.data ?? null;
  const topics = session?.topics ?? [];

  const [quizLoading, setQuizLoading] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [showResults, setShowResults] = useState(false);

  const resetQuizState = () => {
    setCurrent(0);
    setShowResults(false);
    setAnswers(questions ? Array(questions.length).fill(null) : []);
  };

  const startQuiz = async () => {
    if (!session || topics.length === 0) {
      toast.error("No topics yet", {
        description: "Upload a syllabus or reading material first so we can build a quiz.",
      });
      return;
    }

    setQuizLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { topics },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error as string);

      const generated: QuizQuestion[] = (data?.questions ?? [])
        .map((q: any) => ({
          question_text: String(q.question_text ?? ""),
          options: normalizeTopics(q.options),
          correct_answer: String(q.correct_answer ?? ""),
        }))
        .filter((q: QuizQuestion) => q.question_text && q.options.length === 4);

      if (generated.length === 0) {
        throw new Error("The quiz generator didn't return any questions.");
      }

      const { error: insertError } = await supabase.from("quiz_questions").insert(
        generated.map((q) => ({
          session_id: session.id,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
        })),
      );
      if (insertError) {
        toast.error("Couldn't save the quiz", { description: insertError.message });
      }

      setQuestions(generated);
      setAnswers(Array(generated.length).fill(null));
      setCurrent(0);
      setShowResults(false);
    } catch (err) {
      toast.error("Couldn't generate the quiz", {
        description: err instanceof Error ? err.message : "Please try again in a moment.",
      });
    } finally {
      setQuizLoading(false);
    }
  };

  const selectOption = (option: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = option;
      return next;
    });
  };

  const goNext = () => {
    if (!questions) return;
    if (current + 1 < questions.length) setCurrent(current + 1);
    else setShowResults(true);
  };

  const score = questions
    ? questions.filter((q, i) => answers[i] === q.correct_answer).length
    : 0;

  // ---------------------------------------------------------------- quiz view
  if (quizLoading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-8 md:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-6 w-40" />
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground">
            Generating your quiz…
          </p>
        </div>
      </div>
    );
  }

  if (questions && showResults) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-8 md:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <Badge variant="secondary" className="mb-3 font-normal">
              Quiz results
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {score} out of {questions.length}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review your answers below.
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const correct = userAnswer === q.correct_answer;
              return (
                <Card key={i} className="border-border/60">
                  <CardContent className="flex gap-3 p-5">
                    <div
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        correct
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {i + 1}. {q.question_text}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your answer: {userAnswer ?? "—"}
                      </p>
                      {!correct && (
                        <p className="text-sm text-foreground">
                          Correct answer: {q.correct_answer}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={resetQuizState} className="sm:flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={() => {
                setQuestions(null);
                setShowResults(false);
                setCurrent(0);
                setAnswers([]);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resources
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (questions) {
    const question = questions[current]!;
    const selected = answers[current];
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-8 md:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Question {current + 1} of {questions.length}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuestions(null);
                setAnswers([]);
                setCurrent(0);
              }}
            >
              Exit
            </Button>
          </div>
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>

          <Card className="border-border/60">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground">
                {question.question_text}
              </h2>
              <div className="mt-5 space-y-3">
                {question.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectOption(option)}
                    className={cn(
                      "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                      selected === option
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end">
            <Button onClick={goNext} disabled={!selected}>
              {current + 1 === questions.length ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- topics view
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background px-4 py-8 md:px-6 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3 font-normal">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-powered study tools
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Study Companion
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Upload a syllabus PDF or paste a Google Drive link. Syllabus+ will
            extract topics and prepare study resources and quizzes.
          </p>
        </div>

        {/* Upload drop zone */}
        <Card className="overflow-hidden border-border/60 border-dashed bg-gradient-to-b from-card to-sky/20 shadow-sm">
          <CardContent className="p-8 sm:p-12">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-foreground">
                Upload PDF / Paste Drive Link
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Drag and drop a syllabus or reading PDF here, or paste a public
                Google Drive link to get started.
              </p>

              <div className="mt-6 w-full max-w-md">
                <label className="relative block cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="sr-only"
                    onChange={() => {}}
                  />
                  <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent">
                    <span className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />
                      Click to select a PDF file
                    </span>
                  </div>
                </label>
              </div>

              <div className="mt-4 flex w-full max-w-md items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or paste a link</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="mt-4 w-full max-w-md">
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-ring transition-all focus-visible:border-primary focus-visible:ring-2"
                  onChange={() => {}}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* Session topics */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Topics</h3>
          {sessionQuery.isLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
          ) : topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <Badge key={topic} variant="secondary" className="font-normal">
                  {topic}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No topics yet — upload materials above to extract them.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60 bg-muted/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">View Resources</h3>
                <p className="text-sm text-muted-foreground">
                  Curated reading lists and notes will appear here after upload.
                </p>
              </div>
              <Button variant="outline" disabled className="shrink-0">
                View
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Take a Quiz</h3>
                <p className="text-sm text-muted-foreground">
                  AI-generated practice questions based on your session topics.
                </p>
              </div>
              <Button
                className="shrink-0"
                onClick={startQuiz}
                disabled={quizLoading || topics.length === 0}
              >
                Start
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
