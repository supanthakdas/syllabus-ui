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

interface LocalPublication {
  id: number;
  title: string | null;
  author: string | null;
  source: string | null;
  year: number | null;
  url: string | null;
  faculty_name: string | null;
  faculty_department: string | null;
}

interface AIPaperResult {
  id: string | number;
  title: string | null;
  author: string | null;
  year: number | null;
  url: string | null;
  source: string;
  isFaculty?: boolean;
  relevanceReason?: string;
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

async function fetchPapersByFaculty(facultyId: number): Promise<LocalPublication[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
  .from("publications")
  .select("id, title, author, source, year, url, faculty:faculty_id (name, department)")
  .eq("faculty_id", facultyId)
  .limit(15);
  if (error) throw new Error(error.message);

  type Row = {
    id: number;
    title: string | null;
    author: string | null;
    source: string | null;
    year: number | null;
    url: string | null;
    faculty: any;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const fac = Array.isArray(row.faculty) ? row.faculty[0] : row.faculty;
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      source: row.source,
      year: row.year,
      url: row.url,
      faculty_name: fac?.name ?? null,
      faculty_department: fac?.department ?? null,
    };
  });
}

// 1. Fetch from Google Scholar via Edge Function
async function fetchScholarPapers(scholarLink: string, facultyName: string): Promise<LocalPublication[]> {
  const match = scholarLink.match(/user=([A-Za-z0-9_-]+)/);
  if (!match) return [];
  const authorId = match[1];

  try {
    const { data, error } = await supabase.functions.invoke("search-papers", {
      body: { authorId, facultyName },
    });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Edge function error:", e);
    return [];
  }
}

// 2. Fetch from ORCID's Public API
async function fetchOrcidPapers(orcidLink: string, facultyName: string): Promise<LocalPublication[]> {
  const match = orcidLink.match(/([0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9X]{4})/);
  if (!match) return [];
  const orcidId = match[1];

  try {
    const res = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();

    return (json.group || []).map((work: any, i: number) => {
      const summary = work["work-summary"]?.[0];
      return {
        id: parseInt(`999${i}${Math.floor(Math.random() * 100)}`),
                                  title: summary?.title?.title?.value || "Untitled ORCID Paper",
                                  author: facultyName,
                                  source: "ORCID",
                                  year: summary?.["publication-date"]?.year?.value
                                  ? parseInt(summary["publication-date"].year.value)
                                  : null,
                                  url: summary?.url?.value ? summary.url.value : orcidLink,
                                  faculty_name: facultyName,
                                  faculty_department: null,
      };
    });
  } catch (e) {
    console.error("ORCID fetch error:", e);
    return [];
  }
}

// 3. Unified Global Search with Gemini AI
async function searchPapersWithAI(query: string): Promise<AIPaperResult[]> {
  if (!query.trim()) return [];

  // A. Fetch candidate university papers from Supabase
  let facultyCandidates: any[] = [];
  if (supabase) {
    const { data } = await supabase
    .from("publications")
    .select("id, title, author, year, url, faculty:faculty_id (name, department)")
    .limit(30);

    facultyCandidates = (data ?? []).map((row: any) => {
      const fac = Array.isArray(row.faculty) ? row.faculty[0] : row.faculty;
      return {
        id: `fac-${row.id}`,
        title: row.title,
        author: row.author || fac?.name || "Varendra Faculty",
        year: row.year,
        url: row.url,
        source: "Varendra University Faculty",
        isFaculty: true,
      };
    });
  }

  // B. Fetch global paper candidates from Semantic Scholar
  let semanticCandidates: any[] = [];
  try {
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
        query
      )}&limit=15&fields=title,abstract,authors,year,url`
    );
    if (res.ok) {
      const json = await res.json();
      semanticCandidates = (json.data ?? []).map((p: any) => ({
        id: `sem-${p.paperId}`,
        title: p.title,
        author: (p.authors ?? []).map((a: any) => a.name).join(", "),
                                                              year: p.year,
                                                              url: p.url,
                                                              abstract: p.abstract,
                                                              source: "Semantic Scholar",
                                                              isFaculty: false,
      }));
    }
  } catch (err) {
    console.warn("Semantic Scholar candidate error:", err);
  }

  const allCandidates = [...facultyCandidates, ...semanticCandidates];
  if (allCandidates.length === 0) return [];

  // C. Pass candidates to Gemini AI via Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke("ai-paper-search", {
      body: { query, papers: allCandidates },
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("AI Paper Search Error:", err);
    return allCandidates;
  }
}

function ResearchPage() {
  const [department, setDepartment] = useState(ALL_DEPARTMENTS);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [paperFilter, setPaperFilter] = useState("");

  const facultyQuery = useQuery({
    queryKey: ["faculty"],
    queryFn: fetchFaculty,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
  });

  const faculty = facultyQuery.data ?? [];
  const departments = Array.from(
    new Set(faculty.map((f) => f.department).filter((d): d is string => !!d))
  ).sort();

  const visibleFaculty =
  department === ALL_DEPARTMENTS
  ? faculty
  : faculty.filter((f) => f.department === department);

  const selectedFaculty =
  visibleFaculty.find((f) => f.id === selectedFacultyId) ?? null;

  const officeHoursQuery = useQuery({
    queryKey: ["office-hours", selectedFaculty?.id],
    queryFn: () => fetchOfficeHours(selectedFaculty!.id),
                                    enabled: Boolean(selectedFaculty?.id) && isSupabaseConfigured,
  });

  const bookMutation = useMutation({
    mutationFn: bookOfficeHour,
    onSuccess: async (_data, slotId) => {
      const slot = (officeHoursQuery.data ?? []).find((s) => s.id === slotId);
      await officeHoursQuery.refetch();
      toast.success("Appointment requested", {
        description: `${selectedFaculty?.name ?? ""} · ${slot?.day ?? ""} ${
          slot?.time_slot ?? ""
        }`.trim(),
      });
    },
    onError: async (error: Error) => {
      await officeHoursQuery.refetch();
      toast.error("Couldn't book that slot", { description: error.message });
    },
  });

  // Selected faculty papers: DB + Google Scholar + ORCID
  const selectedFacultyPapersQuery = useQuery({
    queryKey: ["faculty-papers-id", selectedFaculty?.id],
    queryFn: async () => {
      if (!selectedFaculty) return [];

      const dbPapers = await fetchPapersByFaculty(selectedFaculty.id);

      let scholarPapers: LocalPublication[] = [];
      if (selectedFaculty.scholar_link) {
        scholarPapers = await fetchScholarPapers(
          selectedFaculty.scholar_link,
          selectedFaculty.name
        );
      }

      let orcidPapers: LocalPublication[] = [];
      if (selectedFaculty.orcid_link) {
        orcidPapers = await fetchOrcidPapers(
          selectedFaculty.orcid_link,
          selectedFaculty.name
        );
      }

      return [...dbPapers, ...scholarPapers, ...orcidPapers];
    },
    enabled: Boolean(selectedFaculty?.id) && isSupabaseConfigured,
  });

  const selectedFacultyPapers = selectedFacultyPapersQuery.data ?? [];
  const filteredFacultyPapers = selectedFacultyPapers.filter((pub) =>
  (pub.title || "").toLowerCase().includes(paperFilter.toLowerCase())
  );

  // Unified AI Global Search Query
  const aiSearchQuery = useQuery({
    queryKey: ["ai-paper-search", query],
    queryFn: () => searchPapersWithAI(query),
                                 enabled: query.length > 0,
                                 retry: false,
  });

  const aiResults = aiSearchQuery.data ?? [];

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
          selectedFacultyId === f.id && "bg-accent"
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
          disabled={bookMutation.isPending}
          onClick={() => bookMutation.mutate(slot.id)}
          className="group disabled:opacity-60"
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

      {/* Faculty Specific Papers */}
      {selectedFacultyPapers.length > 0 && (
        <div className="mt-6 space-y-3 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <BookOpen className="h-4 w-4" />
        Published Papers ({selectedFacultyPapers.length})
        </h3>
        </div>

        {/* Local Paper Search Bar */}
        <Input
        placeholder="Search these papers..."
        value={paperFilter}
        onChange={(e) => setPaperFilter(e.target.value)}
        className="h-8 text-sm bg-muted/50"
        />

        <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
        {filteredFacultyPapers.length > 0 ? (
          filteredFacultyPapers.map((pub) => (
            <div
            key={pub.id}
            className="rounded-md border border-border bg-muted/20 p-3"
            >
            <h4 className="font-medium text-sm">{pub.title}</h4>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
            {pub.author ?? "Unknown Author"} · {pub.year ?? ""}
            </span>
            {pub.url && (
              <a
              href={pub.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
              >
              Read <ExternalLink className="h-3 w-3" />
              </a>
            )}
            </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
          No papers match your search.
          </p>
        )}
        </div>
        </div>
      )}
      </CardContent>
      </Card>
    )}

    {/* Unified AI Search Results */}
    {query && (
      <div className="space-y-4">
      <div className="flex items-center justify-between">
      <div>
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
      <Sparkles className="h-4 w-4 text-primary" />
      AI Curated Results
      </h2>
      <p className="text-sm text-muted-foreground">
      {aiSearchQuery.isLoading
        ? "Gemini AI is analyzing and ranking papers across all sources…"
        : `Found ${aiResults.length} relevant paper${
          aiResults.length === 1 ? "" : "s"
        } for “${query}”`}
        </p>
        </div>
        <Badge variant="secondary" className="gap-1 font-normal">
        <Sparkles className="h-3 w-3" />
        Powered by Gemini
        </Badge>
        </div>

        {aiSearchQuery.isLoading &&
          [0, 1, 2].map((i) => (
            <Card key={i} className="border-border/60">
            <CardHeader className="space-y-2 pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            </CardContent>
            </Card>
          ))}

          {!aiSearchQuery.isLoading && aiResults.length === 0 && (
            <Card className="border-dashed">
            <CardContent className="py-10 text-center">
            <BookOpen className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
            No papers matched “{query}”. Try a broader topic or keyword.
            </p>
            </CardContent>
            </Card>
          )}

          {aiResults.map((paper) => (
            <Card
            key={paper.id}
            className={`transition-shadow hover:shadow-md ${
              paper.isFaculty
              ? "border-primary/40 bg-primary/5"
              : "border-border/60"
            }`}
            >
            <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
            <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold leading-snug text-foreground">
            {paper.title ?? "Untitled publication"}
            </CardTitle>
            {paper.isFaculty && (
              <Badge variant="default" className="text-xs">
              Our Faculty
              </Badge>
            )}
            </div>
            </div>
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
              aria-label="Open publication"
              >
              <ArrowUpRight className="h-4 w-4" />
              </a>
              </Button>
            )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {paper.author || "Unknown author"}
            </span>
            {paper.year && (
              <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {paper.year}
              </span>
            )}
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {paper.source}
            </span>
            </div>
            </CardHeader>
            {paper.relevanceReason && (
              <CardContent className="pt-0">
              <p className="rounded-md bg-background/60 p-2 text-xs text-muted-foreground border border-border/40">
              <span className="font-medium text-foreground">
              AI Insight:
              </span>{" "}
              {paper.relevanceReason}
              </p>
              </CardContent>
            )}
            </Card>
          ))}
          </div>
    )}
    </div>
    </main>
    </div>
    </div>
  );
}
