"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";

type Resource<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: T };

type PaginatedResponse<T> = {
  data: T[];
  pagination: { limit: number; offset: number; total: number };
};

type CountResponse = { pagination: { total: number } };

type DashboardModel = {
  id: string;
  slug: string;
  name: string;
  type: string;
  releaseDate: string | null;
  contextWindow: number | null;
  featured: boolean;
  company: { id: string; slug: string; name: string };
  providers: {
    id: string;
    available: boolean;
    inputPricePerMillion: string | number | null;
    outputPricePerMillion: string | number | null;
    provider: { id: string; slug: string; name: string };
  }[];
};

type DashboardScore = {
  modelId: string;
  score: string | number;
  rank: number | null;
  model: {
    id: string;
    slug: string;
    name: string;
    company: { name: string };
  };
};

type DashboardBenchmark = {
  id: string;
  slug: string;
  name: string;
  description: string;
  scores: DashboardScore[];
};

async function fetchResource<T>(url: string, signal: AbortSignal): Promise<Resource<T>> {
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("Dashboard request failed.");
    return { status: "ready", data: await response.json() as T };
  } catch {
    return signal.aborted ? { status: "loading" } : { status: "error" };
  }
}

function formatContext(value: number | null) {
  if (value === null) return "Not listed";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Release date not listed";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function formatPrice(value: string | number | null) {
  if (value === null) return "Not listed";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not listed";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function lowestPrice(
  providers: DashboardModel["providers"],
  field: "inputPricePerMillion" | "outputPricePerMillion",
) {
  const values = providers
    .filter((entry) => entry.available && entry[field] !== null)
    .map((entry) => entry[field] as string | number)
    .filter((value) => Number.isFinite(Number(value)))
    .sort((left, right) => Number(left) - Number(right));
  return values[0] ?? null;
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function formatScore(value: string | number) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toLocaleString("en", { maximumFractionDigits: 2 }) : "—";
}

function typeLabel(value: string) {
  return value.toLocaleLowerCase().replace(/(^|_)([a-z])/g, (_match, _separator: string, letter: string) => letter.toUpperCase());
}

function CountValue<T extends CountResponse>({ resource }: { resource: Resource<T> }) {
  if (resource.status === "loading") return <>…</>;
  if (resource.status === "error") return <>—</>;
  return <>{resource.data.pagination.total.toLocaleString()}</>;
}

function SectionTitle({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-title-row">
      <div><p className="section-eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      <Link href={href} className="text-link">{linkLabel}<Icon name="arrow" size={15} /></Link>
    </div>
  );
}

function SectionMessage({
  message,
  error = false,
  retry,
}: {
  message: string;
  error?: boolean;
  retry: () => void;
}) {
  return (
    <div className="col-span-full flex min-h-28 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]" role={error ? "alert" : undefined}>
      <p>{message}</p>
      {error && <button type="button" className="secondary-button" onClick={retry}>Try again</button>}
    </div>
  );
}

export default function DashboardOverview() {
  const [models, setModels] = useState<Resource<PaginatedResponse<DashboardModel>>>({ status: "loading" });
  const [companies, setCompanies] = useState<Resource<CountResponse>>({ status: "loading" });
  const [providers, setProviders] = useState<Resource<CountResponse>>({ status: "loading" });
  const [benchmarks, setBenchmarks] = useState<Resource<PaginatedResponse<DashboardBenchmark>>>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      fetchResource<PaginatedResponse<DashboardModel>>(
        "/api/models?limit=3&offset=0&sort=releaseDate&order=desc",
        controller.signal,
      ),
      fetchResource<CountResponse>("/api/companies?limit=1&offset=0", controller.signal),
      fetchResource<CountResponse>("/api/providers?limit=1&offset=0", controller.signal),
      fetchResource<PaginatedResponse<DashboardBenchmark>>(
        "/api/benchmarks?limit=100&offset=0",
        controller.signal,
      ),
    ]).then(([modelResult, companyResult, providerResult, benchmarkResult]) => {
      if (controller.signal.aborted) return;
      setModels(modelResult);
      setCompanies(companyResult);
      setProviders(providerResult);
      setBenchmarks(benchmarkResult);
    });

    return () => controller.abort();
  }, [retryKey]);

  const retry = () => {
    setModels({ status: "loading" });
    setCompanies({ status: "loading" });
    setProviders({ status: "loading" });
    setBenchmarks({ status: "loading" });
    setRetryKey((current) => current + 1);
  };
  const hasErrors = [models, companies, providers, benchmarks].some((resource) => resource.status === "error");
  const featuredModels = models.status === "ready" ? models.data.data : [];

  const leaderboardBenchmark = useMemo(() => {
    if (benchmarks.status !== "ready") return null;
    return [...benchmarks.data.data]
      .sort((left, right) => right.scores.length - left.scores.length || left.name.localeCompare(right.name))[0] ?? null;
  }, [benchmarks]);

  const leaders = useMemo(() => {
    if (!leaderboardBenchmark) return [];
    return [...leaderboardBenchmark.scores]
      .sort((left, right) => Number(right.score) - Number(left.score) || left.model.name.localeCompare(right.model.name))
      .slice(0, 4);
  }, [leaderboardBenchmark]);

  const metrics: { label: string; resource: Resource<CountResponse>; icon: IconName; tone: string; change: string }[] = [
    { label: "AI models tracked", resource: models, icon: "models", tone: "violet", change: "From model catalog" },
    { label: "AI companies & labs", resource: companies, icon: "labs", tone: "blue", change: "From companies directory" },
    { label: "Model providers", resource: providers, icon: "providers", tone: "mint", change: "From providers directory" },
    { label: "Benchmarks indexed", resource: benchmarks, icon: "rankings", tone: "amber", change: "From benchmark catalog" },
  ];

  return (
    <main className="dashboard-main">
      <section className="welcome-row">
        <div>
          <div className="welcome-kicker"><span className="pulse-dot" /> YOUR AI INTELLIGENCE WORKSPACE</div>
          <h1>See the whole <span>AI landscape.</span></h1>
          <p className="welcome-copy">Discover the right models, compare what matters, and keep up with the frontier.</p>
        </div>
        <Link className="primary-button" href="/models"><Icon name="spark" size={17} />Explore models<Icon name="arrow" size={15} /></Link>
      </section>

      {hasErrors && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--ink-2)]" role="alert">
          <span>Some dashboard data could not be loaded.</span>
          <button type="button" className="secondary-button" onClick={retry}>Retry dashboard data</button>
        </div>
      )}

      <div className="snapshot-note"><span className="snapshot-mark"><Icon name="layers" size={14} /></span><span>Live catalog data</span><span className="snapshot-separator">·</span><span>Counts and listings loaded from OneAtlas APIs</span><span className="snapshot-date">Connected <span className="status-dot" /></span></div>

      <section className="metrics-grid" aria-label="Platform overview">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-top"><span className={`metric-icon ${metric.tone}`}><Icon name={metric.icon} size={18} /></span><span className="metric-trend">{metric.resource.status === "error" ? "Unavailable" : metric.resource.status === "loading" ? "Loading…" : metric.change}</span></div>
            <p className="metric-value" aria-live="polite"><CountValue resource={metric.resource} /></p><p className="metric-label">{metric.label}</p>
          </article>
        ))}
      </section>

      <section className="models-section" id="model-spotlight">
        <SectionTitle eyebrow="THE FRONTIER" title="Models to know" href="/models" linkLabel="Explore catalog" />
        <div className="featured-grid">
          {models.status === "loading" ? (
            <SectionMessage message="Loading models from the catalog…" retry={retry} />
          ) : models.status === "error" ? (
            <SectionMessage message="The model catalog could not be loaded." error retry={retry} />
          ) : featuredModels.length === 0 ? (
            <SectionMessage message="No models are available in the catalog yet." retry={retry} />
          ) : featuredModels.map((model) => {
            const availableProviders = model.providers.filter((entry) => entry.available);
            return (
              <article className="featured-card" key={model.id}>
                <div className="featured-top">
                  <span className="company-mark">{initials(model.company.name)}</span>
                  <span className="model-type">{typeLabel(model.type)}</span>
                  <Link href={`/models/${encodeURIComponent(model.slug)}`} className="card-more" aria-label={`Open ${model.name} details`}>···</Link>
                </div>
                <p className="model-company">{model.company.name}</p><h3>{model.name}</h3>
                <div className="model-facts"><span><Icon name="context" size={14} />{formatContext(model.contextWindow)} context</span><span className="bench-score"><Icon name="clock" size={14} />{formatDate(model.releaseDate)}</span></div>
                <div className="price-row"><div><small>INPUT / 1M TOKENS · FROM</small><strong>{formatPrice(lowestPrice(availableProviders, "inputPricePerMillion"))}</strong></div><div><small>OUTPUT / 1M TOKENS · FROM</small><strong>{formatPrice(lowestPrice(availableProviders, "outputPricePerMillion"))}</strong></div><Link href={`/models/${encodeURIComponent(model.slug)}`} aria-label={`View ${model.name}`} className="card-arrow"><Icon name="arrow" size={16} /></Link></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="lower-grid">
        <article className="leaderboard-panel">
          <SectionTitle eyebrow={leaderboardBenchmark?.name ?? "PERFORMANCE INDEX"} title="Leaderboard" href="/rankings" linkLabel="Full rankings" />
          {benchmarks.status === "loading" ? (
            <div className="leaderboard-table"><SectionMessage message="Loading benchmark scores…" retry={retry} /></div>
          ) : benchmarks.status === "error" ? (
            <div className="leaderboard-table"><SectionMessage message="Benchmark scores could not be loaded." error retry={retry} /></div>
          ) : !leaderboardBenchmark || leaders.length === 0 ? (
            <div className="leaderboard-table"><SectionMessage message="No benchmark scores are available yet." retry={retry} /></div>
          ) : (
            <>
              <div className="leaderboard-table" role="table" aria-label={`${leaderboardBenchmark.name} leaderboard`}>
                <div className="leaderboard-head" role="row"><span>RANK / MODEL</span><span>BENCHMARK</span><span>SCORE</span></div>
                {leaders.map((leader, index) => (
                  <div className="leaderboard-row" role="row" key={`${leader.modelId}-${leaderboardBenchmark.id}`}>
                    <div className="leader-model"><span className="leader-rank">{String(index + 1).padStart(2, "0")}</span><span className="leader-dot" /><span className="leader-model-copy"><Link href={`/models/${encodeURIComponent(leader.model.slug)}`}><strong>{leader.model.name}</strong></Link><small>{leader.model.company.name}</small></span></div>
                    <span className="leader-category" title={leaderboardBenchmark.name}>{leaderboardBenchmark.name}</span>
                    <span className="leader-score">{formatScore(leader.score)}</span>
                  </div>
                ))}
              </div>
              <div className="leaderboard-foot"><span><Icon name="clock" size={14} />Sorted within {leaderboardBenchmark.name}</span><Link href="/rankings">Explore benchmarks <Icon name="arrow" size={13} /></Link></div>
            </>
          )}
        </article>

        <aside className="ecosystem-panel">
          <div className="ecosystem-heading"><div><p className="section-eyebrow">CONNECTED ECOSYSTEM</p><h2>Explore the network</h2></div><span className="orbit-icon"><Icon name="spark" size={19} /></span></div>
          <p className="ecosystem-copy">Models are only part of the picture. Follow the labs building them and the providers making them available.</p>
          <Link href="/ai-labs" className="ecosystem-link"><span className="ecosystem-link-icon labs-icon"><Icon name="labs" size={17} /></span><span><strong>AI Labs</strong><small>Research teams & releases</small></span><span className="ecosystem-link-count"><CountValue resource={companies} /></span><Icon name="arrow" size={15} /></Link>
          <Link href="/providers" className="ecosystem-link"><span className="ecosystem-link-icon provider-icon"><Icon name="providers" size={17} /></span><span><strong>Providers</strong><small>Access & availability</small></span><span className="ecosystem-link-count"><CountValue resource={providers} /></span><Icon name="arrow" size={15} /></Link>
          <div className="ecosystem-foot"><span className="status-dot" />Coverage from the live catalog</div>
        </aside>
      </section>

      <footer className="dashboard-footer"><span>OneAtlas <span className="footer-dot">·</span> AI, mapped.</span><span>Designed for builders, researchers, and curious minds.</span></footer>
    </main>
  );
}
