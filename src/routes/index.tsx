import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  FileText,
  GraduationCap,
  MessageSquare,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home — Syllabus+" },
      { name: "description", content: "Welcome to Syllabus+, your personal academic assistant for research, faculty connections, and smarter studying." },
      { property: "og:title", content: "Home — Syllabus+" },
      { property: "og:description", content: "Welcome to Syllabus+, your personal academic assistant for research, faculty connections, and smarter studying." },
    ],
  }),
  component: HomePage,
});

const features = [
  {
    title: "Research & Connect",
    description:
      "Search papers, filter by department and faculty, and find the right professor for your next project.",
    icon: Search,
    href: "/research",
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Study Companion",
    description:
      "Upload syllabi and course materials, view curated resources, and take AI-generated quizzes to test your knowledge.",
    icon: BookOpen,
    href: "/study-companion",
    color: "bg-sky text-sky-foreground",
  },
  {
    title: "Faculty Chat",
    description:
      "Draft outreach emails, compare research interests, and build relationships with university mentors.",
    icon: MessageSquare,
    href: "/research",
    color: "bg-secondary text-secondary-foreground",
  },
];

function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background via-sky/30 to-background px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Welcome to{" "}
            <span className="text-primary">Syllabus+</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Your personal academic assistant for university life. Discover research,
            connect with faculty, and study smarter — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link to="/research">
                <Search className="h-4 w-4" />
                Explore Research
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link to="/study-companion">
                <BookOpen className="h-4 w-4" />
                Open Study Companion
              </Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/60 bg-card/80 backdrop-blur-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="p-6">
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${feature.color}`}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <div className="mt-4">
                  <Link
                    to={feature.href}
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    Get started
                    <Sparkles className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Stats / placeholders */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Papers indexed", value: "12,400+", icon: FileText },
            { label: "Faculty profiles", value: "860", icon: Users },
            { label: "Study guides", value: "320", icon: BookOpen },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/80 p-4 backdrop-blur-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
