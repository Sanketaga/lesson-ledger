/**
 * FIELD NOTES LIBRARY — Keep this page warm, editorial, asymmetric, and trust-first.
 * Paper textures, catalog metadata, Ledger Verdigris, Fraunces headings, and direct interactions only.
 */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BookMarked,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Link2,
  Loader2,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  catalog,
  type CatalogVideo,
  type Topic,
  topics,
  trailCovers,
} from "@/lib/catalog";

type ImportedVideo = CatalogVideo & {
  provider: "YouTube" | "Vimeo";
  isImported: true;
};

type VideoRecord = CatalogVideo | ImportedVideo;

type OEmbedResult = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

function getYoutubeId(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.replace("www.", "").toLowerCase();
    const candidate =
      hostname === "youtu.be"
        ? url.pathname.slice(1)
        : url.searchParams.get("v") ||
            url.pathname.match(/^\/(?:shorts|embed)\/([^/?]+)/)?.[1];
    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function getVimeoId(value: string) {
  try {
    const url = new URL(value);
    if (!url.hostname.replace("www.", "").toLowerCase().endsWith("vimeo.com")) {
      return null;
    }
    return url.pathname.match(/(?:video\/)?(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function oEmbedSource(value: string) {
  const youtubeId = getYoutubeId(value);
  if (youtubeId) {
    return {
      provider: "YouTube" as const,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
      endpoint: `https://www.youtube.com/oembed?url=${encodeURIComponent(value)}&format=json`,
      fallbackThumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = getVimeoId(value);
  if (vimeoId) {
    return {
      provider: "Vimeo" as const,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      endpoint: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(value)}`,
      fallbackThumbnail: "",
    };
  }

  return null;
}

function topicClass(topic: Topic) {
  return {
    Mathematics: "bg-[#E4EBF7] text-[#435D86]",
    Science: "bg-[#F5E4DC] text-[#A84F3B]",
    History: "bg-[#F1E6D4] text-[#8D602B]",
    Technology: "bg-[#EAE5F0] text-[#625170]",
    All: "bg-[#E2F0EC] text-[#08756A]",
  }[topic];
}

function VideoCard({
  video,
  onOpen,
  index,
}: {
  video: VideoRecord;
  onOpen: (video: VideoRecord) => void;
  index: number;
}) {
  const isFeatured = Boolean(video.featured);
  const reference = String(index + 1).padStart(2, "0");

  return (
    <article
      className={`catalog-card group card-reveal overflow-hidden border border-[#E2DACD] bg-[#fffdfa] shadow-[0_10px_24px_rgba(75,58,32,0.065)] ${isFeatured ? "sm:col-span-2" : ""}`}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <button
        type="button"
        onClick={() => onOpen(video)}
        className={`block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[#08756A] focus-visible:ring-offset-4 ${isFeatured ? "sm:grid sm:grid-cols-[1.12fr_0.88fr] sm:items-stretch" : ""}`}
      >
        <div className={`bg-[#EEE6D8] p-1.5 ${isFeatured ? "sm:h-full" : ""}`}>
          <div className={`relative overflow-hidden bg-[#d8ddd4] ${isFeatured ? "aspect-[16/10] sm:h-full sm:aspect-auto" : "aspect-[16/9]"}`}>
            <img
              src={video.thumbnail}
              alt=""
              className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.035]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e2723]/42 via-transparent to-transparent" />
            <span className="absolute left-0 top-0 bg-[#293A32] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#F5F0E6]">record {reference}</span>
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-[#fffdfa]/92 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#2A3630] backdrop-blur-sm">
              <Play className="h-3 w-3 fill-current" />
              Watch
            </span>
          </div>
        </div>
        <div className={`space-y-3 p-4 sm:p-5 ${isFeatured ? "sm:flex sm:flex-col sm:justify-center sm:p-7" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${isFeatured ? "bg-[#F4E0D6] text-[#A84F3B]" : topicClass(video.topic)}`}>
              {isFeatured ? "Field-marked" : video.topic}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#6A706A]">
              <Clock3 className="h-3.5 w-3.5" />
              {video.duration}
            </span>
          </div>
          <div>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.17em] text-[#9B6B31]">{isFeatured ? "Featured shelf · A.01" : `Catalog note · ${reference}`}</p>
            <h3 className={`font-display leading-[1.02] text-[#29332D] transition-colors group-hover:text-[#08756A] ${isFeatured ? "text-[1.9rem] sm:text-[2.35rem]" : "text-[1.4rem]"}`}>
              {video.title}
            </h3>
            <p className="mt-1.5 text-sm font-medium text-[#5E6A62]">{video.channel}</p>
          </div>
          <p className={`${isFeatured ? "" : "line-clamp-2"} text-sm leading-6 text-[#667068]`}>{video.note}</p>
          <div className="flex items-center justify-between border-t border-[#E6E0D5] pt-3 text-xs font-semibold text-[#556057]">
            <span>{video.level} · {video.topic}</span>
            <ArrowUpRight className="h-4 w-4 text-[#08756A] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>
    </article>
  );
}

export default function Home() {
  const [activeTopic, setActiveTopic] = useState<Topic>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importedVideo, setImportedVideo] = useState<ImportedVideo | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);

  const visibleCatalog = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return catalog.filter((video) => {
      const topicMatches = activeTopic === "All" || video.topic === activeTopic;
      const textMatches =
        !needle ||
        [video.title, video.channel, video.topic, video.note, video.level]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return topicMatches && textMatches;
    });
  }, [activeTopic, searchTerm]);

  const featured = catalog.find((video) => video.featured) ?? catalog[0];

  const chooseTopic = (topic: Topic) => {
    setActiveTopic(topic);
    setSearchTerm("");
  };

  const importVideo = async () => {
    const source = oEmbedSource(importUrl.trim());
    if (!source) {
      setImportError("Use a public YouTube or Vimeo link. The catalog stays available either way.");
      return;
    }

    setImportError("");
    setIsImporting(true);
    try {
      const response = await fetch(source.endpoint);
      if (!response.ok) throw new Error("The source did not return oEmbed metadata.");
      const metadata = (await response.json()) as OEmbedResult;
      const record: ImportedVideo = {
        id: `import-${Date.now()}`,
        title: metadata.title || "Imported learning video",
        channel: metadata.author_name || `${source.provider} video`,
        topic: "Technology",
        level: "Direct link",
        duration: "On demand",
        note: "Added from a direct URL using public oEmbed metadata.",
        videoUrl: importUrl.trim(),
        embedUrl: source.embedUrl,
        thumbnail: metadata.thumbnail_url || source.fallbackThumbnail,
        provider: source.provider,
        isImported: true,
      };
      setImportedVideo(record);
      setActiveVideo(record);
      setImportUrl("");
      setImportOpen(false);
      toast.success("Link understood", {
        description: "Metadata was read directly through the provider’s oEmbed endpoint.",
      });
    } catch {
      setImportError("We could not read metadata from that provider just now. Please check the public link and try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#29332D]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-[#DBD3C6] bg-[#EEE6D8]/92 px-5 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-[292px] lg:shrink-0 lg:border-b-0 lg:border-r lg:px-7 lg:py-8">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 lg:block">
              <div className="flex items-center gap-3">
                <img
                  src="/manus-storage/lesson-ledger-mark_33bc4dbf.png"
                  alt=""
                  className="h-12 w-12 shrink-0 object-contain"
                />
                <div>
                  <p className="font-display text-[1.55rem] leading-none tracking-[-0.03em]">Lesson Ledger</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#667068]">video field notes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center border border-[#CFC6B7] bg-[#FFFDF8] text-[#08756A] transition hover:border-[#08756A] hover:bg-[#E2F0EC] active:scale-[0.97] lg:hidden"
                aria-label="Import a video URL"
              >
                <Link2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-7 hidden border-y border-[#D7CFC1] py-4 lg:block">
              <p className="text-xs leading-5 text-[#5E6A62]">
                A small, dependable shelf of explanations worth keeping close.
              </p>
            </div>

            <nav className="mt-5 overflow-x-auto lg:mt-8 lg:overflow-visible" aria-label="Catalog topics">
              <div className="flex gap-2 lg:block lg:space-y-1.5">
                <div className="hidden items-center gap-2 px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7A7E76] lg:flex">
                  <Filter className="h-3.5 w-3.5" />
                  Topics
                </div>
                {topics.map((topic) => (
                  <button
                    key={topic.name}
                    type="button"
                    onClick={() => chooseTopic(topic.name)}
                    className={`group flex shrink-0 items-center gap-2.5 px-3 py-2.5 text-sm font-semibold transition lg:w-full lg:justify-between ${
                      activeTopic === topic.name
                        ? "bg-[#08756A] text-white shadow-[0_8px_16px_rgba(8,117,106,0.16)]"
                        : "text-[#4E5A52] hover:bg-[#E0D8CB]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${activeTopic === topic.name ? "bg-[#F4D7A4]" : topic.accent}`} />
                      {topic.name}
                    </span>
                    <span className={activeTopic === topic.name ? "text-white/70" : "text-[#8A8A7B]"}>{topic.count}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="mt-auto hidden space-y-3 lg:block">
              <div className="border border-[#D5CCBE] bg-[#F8F4EB] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#08756A]">
                    <CircleCheck className="h-3.5 w-3.5" />
                    Catalog mode
                  </span>
                  <span className="text-xs text-[#677269]">{catalog.length} saved</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#667068]">Instant discovery. No search relay required.</p>
              </div>
              <button
                type="button"
                onClick={() => toast("Invidious slot reserved", {
                  description: "Live search is intentionally inactive here. A provider can be added later without changing the catalog fallback.",
                })}
                className="w-full border border-dashed border-[#BDB3A4] bg-transparent p-4 text-left transition hover:border-[#08756A] hover:bg-[#F8F4EB] active:scale-[0.99]"
              >
                <span className="flex items-center gap-2 text-xs font-bold text-[#48534B]">
                  <CircleDashed className="h-4 w-4 text-[#B85C45]" />
                  Invidious live search
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-[#747B73]">Provider slot reserved · catalog remains fallback</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-7 sm:py-7 lg:px-10 lg:py-9 xl:px-14">
          <div className="mx-auto max-w-[1400px]">
            <header className="mb-6 flex items-center justify-between gap-4 lg:mb-9">
              <div className="flex items-center gap-2 text-xs font-medium text-[#68746B]">
                <BookMarked className="h-4 w-4 text-[#08756A]" />
                <span>Curated for concentrated learning</span>
              </div>
              <Button
                type="button"
                onClick={() => setImportOpen(true)}
                className="hidden h-10 bg-[#293A32] px-4 text-xs font-bold tracking-wide text-white hover:bg-[#08756A] active:scale-[0.97] sm:inline-flex"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Import a link
              </Button>
            </header>

            <section className="corner-notch relative overflow-hidden bg-[#E9E0D1] px-6 py-8 sm:px-9 sm:py-10 lg:px-11 lg:py-12">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-35 mix-blend-multiply"
                style={{ backgroundImage: "url('/manus-storage/lesson-ledger-hero_e3d390c3.jpg')" }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#F5F0E6]/95 via-[#F5F0E6]/80 to-[#F5F0E6]/28" aria-hidden="true" />
              <div className="relative max-w-2xl">
                <div className="inline-flex items-center gap-2 border border-[#B9CFC7] bg-[#E7F2EE]/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#08756A]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Catalog + direct URL
                </div>
                <h1 className="mt-5 max-w-xl font-display text-4xl leading-[0.94] tracking-[-0.045em] text-[#28332D] sm:text-5xl lg:text-6xl">
                  Find the next <em className="font-normal text-[#08756A]">useful</em> explanation.
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-[#4F5C53] sm:text-lg">
                  Start with a ready shelf of educational videos, or bring a public link and let oEmbed set the context.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
                    className="h-11 bg-[#08756A] px-5 text-sm font-bold text-white hover:bg-[#065E56] active:scale-[0.97]"
                  >
                    Browse the shelf
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setImportOpen(true)}
                    className="h-11 border-[#9DB7AC] bg-[#FFFDF8]/85 px-5 text-sm font-bold text-[#305449] hover:bg-white active:scale-[0.97]"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Paste a URL
                  </Button>
                </div>
              </div>
              <div className="absolute bottom-7 right-7 hidden max-w-[170px] rotate-[3deg] border border-[#C76547] bg-[#F7E4D9] p-3 text-[#974332] shadow-[3px_4px_0_rgba(143,91,60,0.14)] xl:block">
                <p className="font-display text-xl leading-none">6 notes,<br />4 trails.</p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em]">Filed for focus</p>
              </div>
            </section>

            <section className="mt-7 grid gap-4 md:grid-cols-3 lg:mt-9" aria-label="Learning trails">
              {trailCovers.map((trail) => (
                <button
                  key={trail.name}
                  type="button"
                  onClick={() => chooseTopic(trail.topic)}
                  className="group relative h-36 overflow-hidden text-left shadow-[0_9px_22px_rgba(75,58,32,0.07)] outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#08756A] focus-visible:ring-offset-4 active:scale-[0.99] sm:h-40"
                >
                  <img src={trail.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                  <span className={`absolute inset-0 bg-gradient-to-t ${trail.tone}`} />
                  <span className="absolute bottom-0 left-0 p-4 text-white sm:p-5">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">Explore {trail.topic}</span>
                    <span className="mt-1 block font-display text-xl leading-none">{trail.name}</span>
                  </span>
                </button>
              ))}
            </section>

            <section id="catalog" className="mt-10 scroll-mt-5 lg:mt-14">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#08756A]">The open shelf</p>
                  <h2 className="mt-2 font-display text-3xl leading-none tracking-[-0.035em] sm:text-4xl">{activeTopic === "All" ? "Vetted starting points" : `${activeTopic} field notes`}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#667068]">
                    Each entry is handpicked, with enough context to decide whether it deserves your next few minutes.
                  </p>
                </div>
                <label className="relative block w-full sm:w-[285px]">
                  <span className="sr-only">Search the local catalog</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#657169]" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search the shelf"
                    className="h-11 w-full border border-[#D5CCBE] bg-[#FFFDF8] pl-10 pr-10 text-sm text-[#29332D] outline-none placeholder:text-[#8B8E85] focus:border-[#08756A] focus:ring-2 focus:ring-[#08756A]/15"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-[#657169] hover:text-[#08756A]"
                      aria-label="Clear catalog search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[#D7CFC1] bg-[#EEE6D8]/45 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#667168]">
                <span className="text-[#A84F3B]">Shelf A</span>
                <span>catalog records</span>
                <span className="h-3 w-px bg-[#C5BBAA]" />
                <span>{visibleCatalog.length.toString().padStart(2, "0")} visible notes</span>
                <span className="h-3 w-px bg-[#C5BBAA]" />
                <span>source · direct</span>
              </div>

              {importedVideo && (
                <button
                  type="button"
                  onClick={() => setActiveVideo(importedVideo)}
                  className="mt-7 flex w-full items-center justify-between gap-4 border-l-4 border-[#08756A] bg-[#E2F0EC] px-4 py-3 text-left transition hover:bg-[#D8EBE5] active:scale-[0.995]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#08756A] text-white"><Link2 className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#08756A]">Recent direct import · {importedVideo.provider}</span>
                      <span className="mt-0.5 block truncate text-sm font-bold text-[#2A443A]">{importedVideo.title}</span>
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-[#08756A]" />
                </button>
              )}

              {visibleCatalog.length ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleCatalog.map((video, index) => (
                    <VideoCard key={video.id} video={video} index={index} onOpen={setActiveVideo} />
                  ))}
                </div>
              ) : (
                <div className="mt-7 border border-dashed border-[#C9BEAE] bg-[#FCF8F0] px-6 py-14 text-center">
                  <FileText className="mx-auto h-7 w-7 text-[#B85C45]" />
                  <h3 className="mt-4 font-display text-2xl">No note found yet.</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#68736A]">Try another phrase or return to the full shelf. Your saved catalog is never replaced by a search relay.</p>
                  <Button type="button" variant="outline" onClick={() => chooseTopic("All")} className="mt-5 border-[#B9CFC7] bg-white text-[#08756A] hover:bg-[#E2F0EC]">
                    See every video
                  </Button>
                </div>
              )}
            </section>

            <section className="mt-12 grid gap-6 border-t border-[#D7CFC1] pt-8 sm:grid-cols-[auto_1fr] sm:items-start lg:mt-16 lg:pt-10">
              <div className="flex h-12 w-12 items-center justify-center bg-[#293A32] text-[#F4D7A4]"><GraduationCap className="h-6 w-6" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#08756A]">Why this stays dependable</p>
                <p className="mt-2 max-w-3xl font-display text-2xl leading-tight text-[#37433C]">The catalog works on its own. Link metadata is fetched only when you choose to bring a public YouTube or Vimeo URL.</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#69736B]">The Invidious search provider is reserved for a future optional integration, keeping this experience fast even when no third-party relay is available.</p>
              </div>
            </section>

            <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-[#D7CFC1] py-6 text-xs text-[#747B73] sm:flex-row lg:mt-16">
              <span>Lesson Ledger · built for attention, not infinite scroll</span>
              <span>Catalog + URL mode</span>
            </footer>
          </div>
        </main>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl border-[#D2C8B9] bg-[#FFFDF8] p-0 shadow-[0_24px_70px_rgba(58,48,33,0.2)]">
          <div className="corner-notch border-b border-[#DED6C9] bg-[#E7F0EC] p-6 sm:p-7">
            <DialogHeader>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#08756A]">Direct URL mode</p>
              <DialogTitle className="mt-2 font-display text-3xl leading-none tracking-[-0.035em] text-[#293A32]">Paste a video link—we’ll set the context.</DialogTitle>
              <DialogDescription className="mt-3 max-w-md text-sm leading-6 text-[#567067]">Lesson Ledger asks the public provider for oEmbed metadata. Nothing replaces the local catalog.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6 sm:p-7">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#4C5A51]">Public YouTube or Vimeo URL</span>
              <div className="mt-2 flex border border-[#CFC6B7] bg-white focus-within:border-[#08756A] focus-within:ring-2 focus-within:ring-[#08756A]/15">
                <Link2 className="m-3.5 h-4 w-4 shrink-0 text-[#08756A]" />
                <input
                  value={importUrl}
                  onChange={(event) => {
                    setImportUrl(event.target.value);
                    setImportError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void importVideo();
                  }}
                  className="min-w-0 flex-1 bg-transparent py-3 pr-3 text-sm outline-none placeholder:text-[#98968C]"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </label>
            {importError && <p role="alert" className="mt-3 text-sm leading-6 text-[#A24836]">{importError}</p>}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:gap-4">
              <p className="max-w-[235px] text-xs leading-5 text-[#748078]">Only the link you submit triggers a provider request.</p>
              <Button type="button" onClick={() => void importVideo()} disabled={isImporting} className="h-10 bg-[#08756A] px-4 text-sm font-bold text-white hover:bg-[#065E56] active:scale-[0.97]">
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Read link details
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeVideo)} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-5xl overflow-hidden border-[#1A2520] bg-[#1A2520] p-0 text-[#F6F1E8] shadow-[0_28px_80px_rgba(29,36,31,0.38)]">
          {activeVideo && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{activeVideo.title}</DialogTitle>
                <DialogDescription>Preview the selected educational video.</DialogDescription>
              </DialogHeader>
              <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
                <div className="aspect-video bg-black">
                  <iframe
                    className="h-full w-full"
                    src={activeVideo.embedUrl}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="flex flex-col p-6 sm:p-7">
                  <span className={`w-fit px-2 py-1 text-[10px] font-bold uppercase tracking-[0.13em] ${topicClass(activeVideo.topic)}`}>{activeVideo.topic}</span>
                  <h2 className="mt-4 font-display text-3xl leading-[0.98] tracking-[-0.03em] text-white">{activeVideo.title}</h2>
                  <p className="mt-3 text-sm font-medium text-[#B8C6BE]">{activeVideo.channel} · {activeVideo.duration}</p>
                  <p className="mt-5 text-sm leading-6 text-[#D2DBD5]">{activeVideo.note}</p>
                  <div className="mt-auto pt-7">
                    <a
                      href={activeVideo.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 bg-[#F4D7A4] px-4 text-sm font-bold text-[#25332C] transition hover:bg-[#FFE5B6] active:scale-[0.97]"
                    >
                      Open at source <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
