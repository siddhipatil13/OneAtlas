"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

type Company = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string;
  website: string | null;
  headquarters: string | null;
};

type ProviderEntry = {
  id: string;
  providerModelId: string | null;
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  available: boolean;
  provider: {
    id: string;
    slug: string;
    name: string;
    description: string;
    website: string | null;
    region: string | null;
    company: { id: string; slug: string; name: string } | null;
  };
};

type BenchmarkScore = {
  modelId: string;
  benchmarkId: string;
  score: string;
  rank: number | null;
  evaluatedAt: string;
  benchmark: {
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string;
    sourceUrl: string | null;
  };
};

type ModelDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: "TEXT" | "MULTIMODAL" | "EMBEDDING" | "IMAGE" | "AUDIO" | "VIDEO";
  releaseDate: string | null;
  contextWindow: number | null;
  modalities: string[];
  capabilities: string[];
  featured: boolean;
  company: Company;
  providers: ProviderEntry[];
  scores: BenchmarkScore[];
  createdAt: string;
  updatedAt: string;
};

type PageState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "success"; model: ModelDetail };

const typeNames: Record<ModelDetail["type"], string> = {
  TEXT: "Text",
  MULTIMODAL: "Multimodal",
  EMBEDDING: "Embedding",
  IMAGE: "Image generation",
  AUDIO: "Audio",
  VIDEO: "Video",
};

function formatContext(value: number | null) {
  if (value === null) return "Not listed";
  return `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)} tokens`;
}

function formatDate(value: string | null) {
  if (!value) return "Not listed";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function formatPrice(value: string | null) {
  if (value === null) return "Not provided";
  const price = Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(price);
}

function ModelStateMessage({ kind, retry }: { kind: "not-found" | "error"; retry?: () => void }) {
  const notFound = kind === "not-found";
  return (
    <div className="model-detail-state" role={notFound ? undefined : "alert"}>
      <span className="state-icon"><Icon name={notFound ? "models" : "providers"} size={22} /></span>
      <h1>{notFound ? "Model not found" : "Model details couldn’t load"}</h1>
      <p>{notFound ? "This model may have been removed or the address may be incorrect." : "There was a problem reaching the model catalog. Check your connection and try again."}</p>
      <div className="model-detail-state-actions">
        {!notFound && retry && <button type="button" className="primary-button" onClick={retry}>Try again</button>}
        <Link href="/models" className="secondary-button"><Icon name="arrow" size={14} />Back to Model Discovery</Link>
      </div>
    </div>
  );
}

export default function ModelDetails({ slug }: { slug: string }) {
  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/models/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) {
          setPageState({ status: "not-found" });
          return null;
        }
        if (!response.ok) throw new Error("Model details request failed.");
        const result = await response.json() as { data: ModelDetail };
        return result.data;
      })
      .then((model) => {
        if (model && !controller.signal.aborted) setPageState({ status: "success", model });
      })
      .catch(() => {
        if (!controller.signal.aborted) setPageState({ status: "error" });
      });

    return () => controller.abort();
  }, [slug, retryKey]);

  function retry() {
    setPageState({ status: "loading" });
    setRetryKey((value) => value + 1);
  }

  if (pageState.status === "loading") {
    return (
      <section className="model-detail-content" aria-label="Loading model details" aria-busy="true">
        <div className="detail-breadcrumb"><Link href="/models">Model Discovery</Link><Icon name="chevron" size={13} /><span>Loading model…</span></div>
        <div className="detail-skeleton"><span /><span /><span /><span /><span /></div>
      </section>
    );
  }

  if (pageState.status === "not-found") {
    return <section className="model-detail-content"><div className="detail-breadcrumb"><Link href="/models">Model Discovery</Link><Icon name="chevron" size={13} /><span>Not found</span></div><ModelStateMessage kind="not-found" /></section>;
  }

  if (pageState.status === "error") {
    return <section className="model-detail-content"><div className="detail-breadcrumb"><Link href="/models">Model Discovery</Link><Icon name="chevron" size={13} /><span>Model details</span></div><ModelStateMessage kind="error" retry={retry} /></section>;
  }

  const { model } = pageState;
  const availableProviders = model.providers.filter((entry) => entry.available);

  return (
    <section className="model-detail-content" aria-labelledby="model-detail-title">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/models"><Icon name="arrow" size={13} />Model Discovery</Link>
        <Icon name="chevron" size={13} />
        <span>{model.name}</span>
      </nav>

      <header className="model-detail-hero">
        <div className="detail-company-mark">{model.company.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()}</div>
        <div className="detail-hero-copy">
          <p className="section-eyebrow">{model.company.name}<span className="crumb-slash">/</span>{typeNames[model.type]}</p>
          <h1 id="model-detail-title">{model.name}</h1>
          <p className="detail-model-slug">{model.slug}</p>
        </div>
        <Link href="/models" className="detail-back-button"><Icon name="arrow" size={14} />All models</Link>
      </header>

      <div className="detail-overview-grid">
        <article className="detail-panel detail-description-panel">
          <p className="detail-panel-eyebrow">OVERVIEW</p>
          <h2>About this model</h2>
          <p className="detail-description">{model.description}</p>
          <div className="detail-meta-grid">
            <div><span>Model type</span><strong>{typeNames[model.type]}</strong></div>
            <div><span>Context window</span><strong>{formatContext(model.contextWindow)}</strong></div>
            <div><span>Release date</span><strong>{formatDate(model.releaseDate)}</strong></div>
            <div><span>Company</span><strong>{model.company.name}</strong></div>
          </div>
        </article>

        <article className="detail-panel detail-capability-panel">
          <p className="detail-panel-eyebrow">MODEL PROFILE</p>
          <h2>Modalities</h2>
          <div className="detail-chip-list">
            {model.modalities.length ? model.modalities.map((modality) => <span className="detail-chip modality-chip" key={modality}>{modality}</span>) : <span className="detail-muted">No modalities listed</span>}
          </div>
          <h2 className="detail-subheading">Capabilities</h2>
          <div className="detail-chip-list">
            {model.capabilities.length ? model.capabilities.map((capability) => <span className="detail-chip" key={capability}>{capability}</span>) : <span className="detail-muted">No capabilities listed</span>}
          </div>
        </article>
      </div>

      <section className="detail-panel detail-provider-panel" aria-labelledby="provider-pricing-title">
        <div className="detail-section-heading">
          <div><p className="detail-panel-eyebrow">ACCESS & COST</p><h2 id="provider-pricing-title">Provider pricing</h2></div>
          <span className="detail-section-count">{availableProviders.length} available {availableProviders.length === 1 ? "provider" : "providers"}</span>
        </div>
        {model.providers.length === 0 ? (
          <div className="detail-inline-empty">No provider pricing is currently listed for this model.</div>
        ) : (
          <div className="provider-pricing-list">
            {model.providers.map((entry) => (
              <article className={`provider-pricing-row${entry.available ? "" : " provider-unavailable"}`} key={entry.id}>
                <div className="provider-pricing-name">
                  <span className="provider-icon-box"><Icon name="providers" size={16} /></span>
                  <span><strong>{entry.provider.name}</strong><small>{entry.provider.region ?? entry.provider.company?.name ?? "Model provider"}</small></span>
                </div>
                <div className="provider-price"><span>Input / 1M tokens</span><strong>{formatPrice(entry.inputPricePerMillion)}</strong></div>
                <div className="provider-price"><span>Output / 1M tokens</span><strong>{formatPrice(entry.outputPricePerMillion)}</strong></div>
                <div className="provider-access"><span className={`availability-dot${entry.available ? "" : " unavailable"}`} />{entry.available ? "Available" : "Unavailable"}</div>
                {entry.providerModelId && <div className="provider-model-id">Provider model ID: <code>{entry.providerModelId}</code></div>}
              </article>
            ))}
          </div>
        )}
        <p className="pricing-note">Prices are shown in USD per one million tokens where the provider has published pricing.</p>
      </section>

      <section className="detail-panel detail-benchmarks-panel" aria-labelledby="benchmark-scores-title">
        <div className="detail-section-heading">
          <div><p className="detail-panel-eyebrow">EVALUATIONS</p><h2 id="benchmark-scores-title">Benchmark scores</h2></div>
          <span className="detail-section-count">{model.scores.length} {model.scores.length === 1 ? "result" : "results"}</span>
        </div>
        {model.scores.length === 0 ? (
          <div className="detail-inline-empty">No benchmark scores are available for this model yet.</div>
        ) : (
          <div className="benchmark-score-list">
            {model.scores.map((result) => (
              <article className="benchmark-score-row" key={`${result.modelId}-${result.benchmarkId}`}>
                <span className="benchmark-rank">{result.rank ? `#${result.rank}` : "—"}</span>
                <div className="benchmark-name"><strong>{result.benchmark.name}</strong><small>{result.benchmark.category} · evaluated {formatDate(result.evaluatedAt)}</small></div>
                <strong className="benchmark-score-value" aria-label={`Score ${result.score}`}>{Number(result.score).toLocaleString("en", { maximumFractionDigits: 2 })}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="detail-footer-link"><Link href="/models"><Icon name="arrow" size={14} />Back to Model Discovery</Link></div>
    </section>
  );
}
