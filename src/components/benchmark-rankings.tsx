"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

const PAGE_SIZE = 100;

type BenchmarkCategory = "REASONING" | "CODING" | "MATH" | "KNOWLEDGE" | "MULTIMODAL";
type BenchmarkEntry = {
  id: string;
  slug: string;
  name: string;
  category: BenchmarkCategory;
  description: string;
  sourceUrl: string | null;
  scores: {
    modelId: string;
    benchmarkId: string;
    score: string;
    rank: number | null;
    evaluatedAt: string;
    model: {
      id: string;
      slug: string;
      name: string;
      company: { id: string; slug: string; name: string };
    };
  }[];
};
type BenchmarkListResponse = {
  data: BenchmarkEntry[];
  pagination: { limit: number; offset: number; total: number };
};
type SortDirection = "desc" | "asc";
type RankedScore = BenchmarkEntry["scores"][number] & { displayRank: number };

const categoryLabels: Record<BenchmarkCategory, string> = {
  REASONING: "Reasoning",
  CODING: "Coding",
  MATH: "Math",
  KNOWLEDGE: "Knowledge",
  MULTIMODAL: "Multimodal",
};

async function fetchAllBenchmarks(signal: AbortSignal) {
  const firstResponse = await fetch(`/api/benchmarks?limit=${PAGE_SIZE}&offset=0`, { signal });
  if (!firstResponse.ok) throw new Error("Could not load benchmark data.");
  const firstPage = await firstResponse.json() as BenchmarkListResponse;
  const offsets = Array.from(
    { length: Math.ceil(firstPage.pagination.total / PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * PAGE_SIZE,
  );
  const remainingPages = await Promise.all(offsets.map(async (offset) => {
    const response = await fetch(`/api/benchmarks?limit=${PAGE_SIZE}&offset=${offset}`, { signal });
    if (!response.ok) throw new Error("Could not load the complete benchmark catalog.");
    return response.json() as Promise<BenchmarkListResponse>;
  }));
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

function formatScore(value: string) {
  return Number(value).toLocaleString("en", { maximumFractionDigits: 2 });
}

export default function BenchmarkRankings() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [category, setCategory] = useState<"ALL" | BenchmarkCategory>("ALL");
  const [benchmarkSlug, setBenchmarkSlug] = useState("");
  const [direction, setDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const controller = new AbortController();
    fetchAllBenchmarks(controller.signal)
      .then((items) => {
        setBenchmarks(items);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [retryKey]);

  const categories = useMemo(
    () => [...new Set(benchmarks.map((benchmark) => benchmark.category))].sort((a, b) => categoryLabels[a].localeCompare(categoryLabels[b])),
    [benchmarks],
  );
  const availableBenchmarks = useMemo(
    () => benchmarks.filter((benchmark) => category === "ALL" || benchmark.category === category),
    [benchmarks, category],
  );
  const activeBenchmark = availableBenchmarks.find((benchmark) => benchmark.slug === benchmarkSlug) ?? availableBenchmarks[0] ?? null;

  const rankedScores = useMemo<RankedScore[]>(() => {
    if (!activeBenchmark) return [];
    const sorted = [...activeBenchmark.scores].sort((left, right) => {
      const scoreDifference = Number(left.score) - Number(right.score);
      return (direction === "desc" ? -scoreDifference : scoreDifference)
        || left.model.name.localeCompare(right.model.name);
    });

    let displayRank = 0;
    let previousScore: number | null = null;
    return sorted.map((entry, index) => {
      const score = Number(entry.score);
      if (previousScore === null || score !== previousScore) displayRank = index + 1;
      previousScore = score;
      return { ...entry, displayRank };
    });
  }, [activeBenchmark, direction]);

  const topScore = activeBenchmark?.scores.reduce<number | null>((highest, item) => {
    const value = Number(item.score);
    return highest === null || value > highest ? value : highest;
  }, null) ?? null;

  function retry() {
    setLoading(true);
    setError(false);
    setRetryKey((current) => current + 1);
  }

  function changeCategory(value: "ALL" | BenchmarkCategory) {
    setCategory(value);
    setBenchmarkSlug("");
  }

  return (
    <section className="benchmark-rankings mx-auto w-full max-w-[1260px] px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="rankings-page-title">
      <header className="rankings-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="section-eyebrow"><span className="pulse-dot" />PERFORMANCE INDEX</p>
          <h1 id="rankings-page-title">Rankings & benchmarks</h1>
          <p className="rankings-intro">Explore how models perform across real benchmark evaluations.</p>
        </div>
        <div className="rankings-count"><Icon name="rankings" size={18} /><span><strong>{loading ? "…" : benchmarks.length}</strong><small>benchmarks available</small></span></div>
      </header>

      {loading ? (
        <div className="rankings-loading" aria-label="Loading benchmarks" aria-busy="true"><span /><span /><span /></div>
      ) : error ? (
        <div className="rankings-state rankings-error" role="alert">
          <span className="rankings-state-icon"><Icon name="providers" size={22} /></span>
          <h2>Benchmark data couldn’t load</h2>
          <p>There was a problem reaching the benchmark catalog. Check your connection and try again.</p>
          <button type="button" className="primary-button" onClick={retry}>Try again</button>
        </div>
      ) : benchmarks.length === 0 ? (
        <div className="rankings-state">
          <span className="rankings-state-icon"><Icon name="rankings" size={22} /></span>
          <h2>No benchmarks available</h2>
          <p>Benchmark evaluations will appear here when they are added to the catalog.</p>
        </div>
      ) : (
        <>
          <div className="rankings-controls mt-7">
            <label className="ranking-filter">
              <span>Category</span>
              <select value={category} onChange={(event) => changeCategory(event.target.value as "ALL" | BenchmarkCategory)} aria-label="Filter benchmarks by category">
                <option value="ALL">All categories</option>
                {categories.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}
              </select>
            </label>
            <label className="ranking-filter benchmark-select">
              <span>Benchmark</span>
              <select value={activeBenchmark?.slug ?? ""} onChange={(event) => setBenchmarkSlug(event.target.value)} aria-label="Choose benchmark">
                {availableBenchmarks.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="ranking-filter ranking-sort-filter">
              <span>Sort scores</span>
              <select value={direction} onChange={(event) => setDirection(event.target.value as SortDirection)} aria-label="Sort scores">
                <option value="desc">Highest to lowest</option>
                <option value="asc">Lowest to highest</option>
              </select>
            </label>
          </div>

          {availableBenchmarks.length > 1 && (
            <nav className="benchmark-switcher" aria-label="Available benchmarks">
              {availableBenchmarks.map((item) => (
                <button type="button" key={item.id} className={`benchmark-tab${item.slug === activeBenchmark?.slug ? " active" : ""}`} onClick={() => setBenchmarkSlug(item.slug)} aria-pressed={item.slug === activeBenchmark?.slug}>
                  {item.name}<span>{item.scores.length}</span>
                </button>
              ))}
            </nav>
          )}

          {activeBenchmark ? (
            <>
              <section className="benchmark-summary" aria-labelledby="active-benchmark-name">
                <div className="benchmark-summary-main">
                  <p className="detail-panel-eyebrow">{categoryLabels[activeBenchmark.category]} BENCHMARK</p>
                  <h2 id="active-benchmark-name">{activeBenchmark.name}</h2>
                  <p>{activeBenchmark.description}</p>
                  {activeBenchmark.sourceUrl && <a href={activeBenchmark.sourceUrl} target="_blank" rel="noreferrer">Benchmark source <Icon name="arrow" size={13} /></a>}
                </div>
                <div className="benchmark-summary-stats">
                  <div><span>Evaluated models</span><strong>{activeBenchmark.scores.length}</strong></div>
                  <div><span>Top score</span><strong>{topScore === null ? "—" : formatScore(String(topScore))}</strong></div>
                </div>
              </section>

              <div className="rankings-list-heading"><div><p className="detail-panel-eyebrow">LEADERBOARD</p><h2>Model results</h2></div><span>{rankedScores.length} scored {rankedScores.length === 1 ? "model" : "models"}</span></div>

              {rankedScores.length === 0 ? (
                <div className="rankings-state rankings-no-scores">
                  <span className="rankings-state-icon"><Icon name="layers" size={21} /></span>
                  <h2>No scores for this benchmark yet</h2>
                  <p>This benchmark is in the catalog, but no model results have been recorded.</p>
                </div>
              ) : (
                <ol className="rankings-results" aria-label={`${activeBenchmark.name} model rankings`}>
                  {rankedScores.map((result) => (
                    <li className="ranking-result-row" key={`${result.modelId}-${result.benchmarkId}`}>
                      <span className={`ranking-place${result.displayRank <= 3 ? ` top-rank rank-${result.displayRank}` : ""}`}>{String(result.displayRank).padStart(2, "0")}</span>
                      <span className="ranking-model-avatar">{result.model.company.name.slice(0, 1).toUpperCase()}</span>
                      <div className="ranking-model-copy"><Link href={`/models/${encodeURIComponent(result.model.slug)}`}>{result.model.name}</Link><span>{result.model.company.name}</span></div>
                      <span className="ranking-benchmark-name">{activeBenchmark.name}</span>
                      <strong className="ranking-score">{formatScore(result.score)}</strong>
                    </li>
                  ))}
                </ol>
              )}
              <p className="rankings-footnote">Rank numbers follow the selected score order. Models without a recorded score are omitted, not assigned a zero.</p>
            </>
          ) : (
            <div className="rankings-state rankings-no-scores"><span className="rankings-state-icon"><Icon name="filter" size={21} /></span><h2>No benchmarks match this category</h2><p>Choose another category to explore benchmark results.</p></div>
          )}
        </>
      )}
    </section>
  );
}
