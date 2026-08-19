import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { normalizeLearningQuery } from "@shared/learningQuery";
import { catalog, filterCatalog, type CatalogVideo } from "@/lib/catalog";
import { Search, Play, Loader2 } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const normalized = normalizeLearningQuery(searchTerm) || "";
  const visibleCatalog = useMemo(() => filterCatalog("All", normalized), [normalized]);

  const shouldUseLiveSearch = normalized.length >= 2 && visibleCatalog.length === 0;
  const liveSearch = trpc.liveSearch.search.useQuery(
    { query: shouldUseLiveSearch ? normalized : "learning" },
    { enabled: shouldUseLiveSearch, staleTime: 60_000, retry: 0 },
  );

  const liveResults = (liveSearch.data?.results ?? []).map(r => ({
    id: `live-${r.provider}-${r.videoId}`,
    title: r.title,
    channel: r.channel,
    thumbnail: r.thumbnail || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
    duration: r.duration,
    videoId: r.videoId,
  }));

  const handleSearch = () => {
    const q = normalizeLearningQuery(searchTerm) || searchTerm.trim();
    if (q.length >= 2) setLocation(`/learn/${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <header className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lesson Ledger</h1>
        <button onClick={() => setLocation("/learn")} className="text-sm underline">Go to Courses</button>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="mb-4 flex gap-2">
          <div className="flex items-center gap-2 border rounded px-3 py-2 w-full">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="flex-1 outline-none"
              placeholder="Search the catalog or paste a video URL"
            />
            <button onClick={handleSearch} className="text-sm text-white bg-black px-3 py-1 rounded">Search</button>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-medium mb-2">Catalog matches</h2>
          {visibleCatalog.length === 0 ? <p className="text-sm text-gray-500">No local matches</p> : (
            <ul className="space-y-2">
              {visibleCatalog.map((v: CatalogVideo) => (
                <li key={v.id} className="flex items-center gap-3 border p-2 rounded">
                  <img src={v.thumbnail} alt="" className="h-12 w-20 object-cover rounded" />
                  <div className="flex-1">
                    <div className="font-medium">{v.title}</div>
                    <div className="text-xs text-gray-500">{v.channel} · {v.duration}</div>
                  </div>
                  <button onClick={() => setLocation(`/learn/${encodeURIComponent(normalizeLearningQuery(v.title) || v.title)}`)} className="px-2 py-1 bg-gray-900 text-white rounded text-sm">Open</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Live search</h2>
          {shouldUseLiveSearch ? (
            liveSearch.isFetching ? (
              <div className="flex items-center gap-2 text-gray-600"><Loader2 className="animate-spin" /> Searching...</div>
            ) : liveResults.length > 0 ? (
              <ul className="space-y-2">
                {liveResults.map(r => (
                  <li key={r.id} className="flex items-center gap-3 border p-2 rounded">
                    <img src={r.thumbnail} alt="" className="h-12 w-20 object-cover rounded" />
                    <div className="flex-1">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-gray-500">{r.channel} · {r.duration}</div>
                    </div>
                    <a href={`https://www.youtube.com/watch?v=${r.videoId}`} target="_blank" rel="noreferrer" className="px-2 py-1 bg-gray-900 text-white rounded text-sm">Open</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No live results found. Try a different phrase.</p>
            )
          ) : (
            <p className="text-sm text-gray-500">Enter a query (2+ chars) to search public providers when no local match exists.</p>
          )}
        </section>
      </main>
    </div>
  );
}
