import { createFileRoute } from "@tanstack/react-router";
import { Upload, FileText, BookOpen, HelpCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

function StudyCompanionPage() {
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

        {/* Placeholder actions */}
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

          <Card className="border-border/60 bg-muted/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Take Quiz</h3>
                <p className="text-sm text-muted-foreground">
                  AI-generated practice questions will be ready once materials are processed.
                </p>
              </div>
              <Button variant="outline" disabled className="shrink-0">
                Start
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder uploaded materials list */}
        <div className="mt-10">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Recent materials
          </h3>
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            No materials uploaded yet. Upload a PDF or paste a Drive link above to see them here.
          </div>
        </div>
      </div>
    </div>
  );
}
