import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  CalendarCheck,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isSupabaseConfigured,
  supabase,
  type Faculty,
  type OfficeHour,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research & Connect — Syllabus+" },
      {
        name: "description",
        content:
          "Search research papers, filter faculty by department, and book open office-hour slots on Syllabus+.",
      },
      { property: "og:title", content: "Research & Connect — Syllabus+" },
      {
        property: "og:description",
        content:
          "Search research papers, filter faculty by department, and book open office-hour slots on Syllabus+.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchPage,
});

const ALL_DEPARTMENTS = "All Departments";

interface PaperAuthor {
  authorId?: string | null;
  name?: string | null;
}

interface Paper {
  paperId: string;
  title?: string | null;
  abstract?: string | null;
  year?: number | null;
  url?: string | null;
  authors?: PaperAuthor[] | null;
}

interface LocalPublication {
  id: number;
  title: string | null;
  year: number | null;
  link: string | null;
  faculty_name: string | null;
  faculty_department: string | null;
}

async function fetchFaculty(): Promise<Faculty[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("faculty")
    .select("id, name, department, scholar_link, orcid_link")
    .order("name", { ascending: true })
    .returns<Faculty[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchOfficeHours(facultyId: number): Promise<OfficeHour[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("office_hours")
    .select("id, faculty_name, day, time_slot, status")
    .eq("faculty_id", facultyId)
    .eq("status", "free")
    .returns<OfficeHour[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function bookOfficeHour(slotId: number): Promise<void> {
  if (!supabase) throw new Error("Database is not connected.");
  const { data, error } = await supabase
    .from("office_hours")
    .update({ status: "requested" })
    .eq("id", slotId)
    .eq("status", "free")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("That slot was just taken. Please pick another one.");
  }
}

async function fetchFacultyPapers(term: string): Promise<LocalPublication[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("publications")
    .select("id, title, year, link, faculty:faculty_id (name, department)")
    .ilike("title", `%${term}%`)
    .limit(15);
  if (error) throw new Error(error.message);
  type Row = {
    id: number;
    title: string | null;
    year: number | null;
    link: string | null;
    faculty:
      | { name: string | null; department: string | null }
      | { name: string | null; department: string | null }[]
      | null;
  };
  return ((data ?? []) as unknown as Row[]).map((row) => {
    const fac = Array.isArray(row.faculty) ? row.faculty[0] : row.faculty;
    return {
      id: row.id,
      title: row.title,
      year: row.year,
      link: row.link,
      faculty_name: fac?.name ?? null,
      faculty_department: fac?.department ?? null,
    };
  });
}

async function searchPapers(term: string): Promise<Paper[]> {
  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
      term,
    )}&limit=15&fields=title,abstract,authors,year,url`,
  );
  if (!res.ok) {
    throw new Error(
      res.status === 429
        ? "Semantic Scholar is rate-limiting requests. Try again in a moment."
        : "Could not load papers right now.",
    );
  }
  const json = (await res.json()) as { data?: Paper[] };
  return json.data ?? [];
}

function ResearchPage() {
  const [department, setDepartment] = useState(ALL_DEPARTMENTS);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const facultyQuery = useQuery({
    queryKey: ["faculty"],
    queryFn: fetchFaculty,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
  });

  const faculty = facultyQuery.data ?? [];
  const departments = Array.from(
    new Set(faculty.map((f) => f.department).filter((d): d is string => !!d)),
  ).sort();

  const visibleFaculty =
    department === ALL_DEPARTMENTS
      ? faculty
      : faculty.filter((f) => f.department === department);

  const selectedFaculty =
    visibleFaculty.find((f) => f.id === selectedFacultyId) ?? null;

  const officeHoursQuery = useQuery({
    queryKey: ["office-hours", selectedFaculty?.name],
    queryFn: () => fetchOfficeHours(selectedFaculty!.name),
    enabled: Boolean(selectedFaculty?.name) && isSupabaseConfigured,
  });

  const papersQuery = useQuery({
    queryKey: ["papers", query],
    queryFn: () => searchPapers(query),
    enabled: query.length > 0,
    retry: false,
  });

  const papers = papersQuery.data ?? [];

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setQuery(searchInput.trim());
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-background">
      <header className="border-b border-border bg-card/50 px-4 py-4 backdrop-blur-sm md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Research &amp; Connect
            </h1>
            <p className="text-sm text-muted-foreground">
              Find papers, explore faculty research, and book office hours.
            </p>
          </div>
          <form onSubmit={onSearch} className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search papers by topic or keyword..."
              className="pl-9 pr-20"
              aria-label="Search research papers"
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              disabled={!searchInput.trim()}
            >
              Search
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Filters + faculty */}
        <aside className="w-full border-b border-border bg-card/50 md:w-72 md:border-b-0 md:border-r">
          <ScrollArea className="h-full max-h-[calc(100vh-8rem)] px-4 py-4">
            <div className="space-y-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Filter className="h-4 w-4" />
                Filters
              </h2>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Department
                </label>
                {facultyQuery.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select
                    value={department}
                    onValueChange={(value) => {
                      setDepartment(value);
                      setSelectedFacultyId(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_DEPARTMENTS}>
                        {ALL_DEPARTMENTS}
                      </SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Faculty {visibleFaculty.length > 0 && `(${visibleFaculty.length})`}
                </label>

                {!isSupabaseConfigured ? (
                  <p className="text-xs text-muted-foreground">
                    Connect your database to load faculty.
                  </p>
                ) : facultyQuery.isLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : facultyQuery.isError ? (
                  <p className="text-xs text-destructive">
                    Couldn&apos;t load faculty. Please try again.
                  </p>
                ) : visibleFaculty.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No faculty found for this department.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {visibleFaculty.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedFacultyId(f.id)}
                          className={cn(
                            "w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
                            selectedFacultyId === f.id && "bg-accent",
                          )}
                        >
                          <span className="block text-sm font-medium text-foreground">
                            {f.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {f.department ?? "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-background px-4 py-5 md:px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Selected faculty profile */}
            {selectedFaculty && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {selectedFaculty.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {selectedFaculty.department ?? "Department not listed"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedFaculty.scholar_link && (
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <a
                            href={selectedFaculty.scholar_link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Google Scholar
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {selectedFaculty.orcid_link && (
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <a
                            href={selectedFaculty.orcid_link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ORCID
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4" />
                    Open office hours
                  </h3>

                  {officeHoursQuery.isLoading ? (
                    <div className="flex flex-wrap gap-2">
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-8 w-40" />
                      ))}
                    </div>
                  ) : officeHoursQuery.isError ? (
                    <p className="text-sm text-destructive">
                      Couldn&apos;t load office hours.
                    </p>
                  ) : (officeHoursQuery.data ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No free slots available right now. Check back later.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(officeHoursQuery.data ?? []).map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() =>
                            toast.success("Appointment requested", {
                              description: `${selectedFaculty.name} · ${slot.day ?? ""} ${
                                slot.time_slot ?? ""
                              }`.trim(),
                            })
                          }
                          className="group"
                        >
                          <Badge
                            variant="secondary"
                            className="cursor-pointer gap-1.5 px-3 py-1.5 text-xs font-normal transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                          >
                            <CalendarCheck className="h-3.5 w-3.5" />
                            {[slot.day, slot.time_slot].filter(Boolean).join(" · ") ||
                              "Open slot"}
                            <span className="font-medium">· Book</span>
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Papers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {query
                    ? papersQuery.isLoading
                      ? "Searching Semantic Scholar…"
                      : `Showing ${papers.length} result${papers.length === 1 ? "" : "s"} for “${query}”`
                    : "Search a topic above to discover papers."}
                </p>
                {query && (
                  <Badge variant="outline" className="font-normal">
                    Semantic Scholar
                  </Badge>
                )}
              </div>

              {papersQuery.isLoading &&
                [0, 1, 2].map((i) => (
                  <Card key={i} className="border-border/60">
                    <CardHeader className="space-y-2 pb-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </CardContent>
                  </Card>
                ))}

              {papersQuery.isError && (
                <Card className="border-destructive/40">
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    {(papersQuery.error as Error).message}
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => papersQuery.refetch()}
                      >
                        Retry
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {query && !papersQuery.isLoading && !papersQuery.isError && papers.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center">
                    <BookOpen className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No papers matched “{query}”. Try a broader keyword.
                    </p>
                  </CardContent>
                </Card>
              )}

              {papers.map((paper) => (
                <Card
                  key={paper.paperId}
                  className="border-border/60 transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg font-semibold leading-snug text-foreground">
                        {paper.title ?? "Untitled paper"}
                      </CardTitle>
                      {paper.url && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-primary"
                        >
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open paper"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {(paper.authors ?? [])
                          .map((a) => a.name)
                          .filter(Boolean)
                          .slice(0, 4)
                          .join(", ") || "Unknown authors"}
                        {(paper.authors ?? []).length > 4 && " et al."}
                      </span>
                      {paper.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {paper.year}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {paper.abstract
                        ? paper.abstract.length > 320
                          ? `${paper.abstract.slice(0, 320)}…`
                          : paper.abstract
                        : "No abstract available for this paper."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        onClick={() =>
                          toast("Discuss with AI", {
                            description: `AI talking points for “${
                              paper.title ?? "this paper"
                            }” are coming soon.`,
                          })
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Discuss with AI
                      </Button>
                      {paper.url && (
                        <Button asChild size="sm" variant="ghost" className="gap-1.5">
                          <a href={paper.url} target="_blank" rel="noreferrer">
                            View paper
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
