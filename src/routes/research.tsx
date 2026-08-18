import { createFileRoute } from "@tanstack/react-router";
import { Search, Filter, BookOpen, User, Calendar, ArrowUpRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research & Connect — Syllabus+" },
      { name: "description", content: "Search research papers, filter by department and faculty, and connect with professors on Syllabus+." },
      { property: "og:title", content: "Research & Connect — Syllabus+" },
      { property: "og:description", content: "Search research papers, filter by department and faculty, and connect with professors on Syllabus+." },
    ],
  }),
  component: ResearchPage,
});

const departments = [
  "All Departments",
  "Computer Science",
  "Biology",
  "Economics",
  "Psychology",
  "Mechanical Engineering",
  "History",
] as const;

const teachers = [
  "All Teachers",
  "Dr. A. Smith",
  "Prof. B. Chen",
  "Dr. C. Johnson",
  "Prof. D. Patel",
  "Dr. E. Williams",
] as const;


const mockPapers = [
  {
    id: "1",
    title: "Reinforcement Learning for Adaptive Robotics Control",
    authors: "Dr. A. Smith, J. Doe",
    department: "Computer Science",
    year: 2024,
    abstract:
      "We propose a sample-efficient reinforcement learning framework that enables robots to adapt to unseen environments with minimal real-world trials.",
    tags: ["AI", "Robotics", "RL"],
  },
  {
    id: "2",
    title: "CRISPR-Based Gene Editing in Crop Resistance",
    authors: "Prof. B. Chen, L. Garcia",
    department: "Biology",
    year: 2023,
    abstract:
      "A review of recent advances in CRISPR techniques for improving drought and pest resistance in major cereal crops.",
    tags: ["Genetics", "Agriculture", "CRISPR"],
  },
  {
    id: "3",
    title: "Behavioral Nudges in Sustainable Consumption",
    authors: "Dr. C. Johnson, M. Lee",
    department: "Economics",
    year: 2024,
    abstract:
      "Field experiments show that small behavioral nudges can significantly increase participation in campus recycling and reuse programs.",
    tags: ["Behavioral Economics", "Sustainability"],
  },
  {
    id: "4",
    title: "Sleep Quality and Academic Performance in Undergraduates",
    authors: "Prof. D. Patel, S. Kim",
    department: "Psychology",
    year: 2023,
    abstract:
      "Longitudinal study linking sleep consistency, stress, and GPA across a cohort of first-year university students.",
    tags: ["Sleep", "Mental Health", "Education"],
  },
  {
    id: "5",
    title: "Lightweight Composite Materials for Aerospace Structures",
    authors: "Dr. E. Williams, R. Ali",
    department: "Mechanical Engineering",
    year: 2024,
    abstract:
      "Novel carbon-fiber reinforced designs reduce weight while maintaining structural integrity under cyclic loading conditions.",
    tags: ["Materials", "Aerospace"],
  },
];

function ResearchPage() {
  const [department, setDepartment] = useState<string>(departments[0]);
  const [teacher, setTeacher] = useState<string>(teachers[0]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-background">
      {/* Top search bar */}
      <header className="border-b border-border bg-card/50 px-4 py-4 backdrop-blur-sm md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Research & Connect
            </h1>
            <p className="text-sm text-muted-foreground">
              Find papers, explore faculty research, and connect with professors.
            </p>
          </div>
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search papers, topics, or professors..."
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Filter sidebar */}
        <aside className="w-full border-b border-border bg-card/50 md:w-64 md:border-b-0 md:border-r">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-5">
              <div>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Filter className="h-4 w-4" />
                  Filters
                </h2>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Department
                </label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Teacher Name
                </label>
                <Select value={teacher} onValueChange={setTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher} value={teacher}>
                        {teacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Publication Year
                </label>
                <div className="flex gap-2">
                  <Input placeholder="From" />
                  <Input placeholder="To" />
                </div>
              </div>

              <Button className="w-full gap-2" variant="secondary">
                <Search className="h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </ScrollArea>
        </aside>

        {/* Main results area */}
        <main className="flex-1 overflow-auto bg-background px-4 py-5 md:px-6">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{mockPapers.length}</span> mock results
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  Mock Data
                </Badge>
              </div>
            </div>

            {mockPapers.map((paper) => (
              <Card
                key={paper.id}
                className="border-border/60 transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg font-semibold leading-snug text-foreground">
                      {paper.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-primary"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {paper.authors}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {paper.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {paper.year}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {paper.abstract}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {paper.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="font-normal text-primary"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
