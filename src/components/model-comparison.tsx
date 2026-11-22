"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icon";

const PAGE_SIZE = 100;
const MAX_SELECTIONS = 4;

type ModelOption = {
  id: string;
  slug: string;
  name: string;
  company: { id: string; slug: string; name: string };
};

type ModelListResponse = {
  data: ModelOption[];
  pagination: { limit: number; offset: number; total: number };
};

type ProviderOffer = {
  id: string;
  providerModelId: string | null;
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  available: boolean;
  provider: { id: string; slug: string; name: string };
};

type BenchmarkScore = {
  score: string;
  rank: number | null;
  evaluatedAt: string;
  benchmark: { name: string; category: string };
};

type ComparisonModel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: "TEXT" | "MULTIMODAL" | "EMBEDDING" | "IMAGE" | "AUDIO" | "VIDEO";
  releaseDate: string | null;
  contextWindow: number | null;
  modalities: string[];
  capabilities: string[];
  company: { id: string; slug: string; name: string };
  providers: ProviderOffer[];
  scores: BenchmarkScore[];
};

type CatalogStatus = "loading" | "ready" | "error";

const modelTypeLabels: Record<ComparisonModel["type"], string> = {
  TEXT: "Text",
  MULTIMODAL: "Multimodal",
  EMBEDDING: "Embedding",
  IMAGE: "Image",
  AUDIO: "Audio",
  VIDEO: "Video",
};

function formatContext(value: number | null) {
  if (value === null) return "Not listed";
  return `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)} tokens`;
}

function formatPrice(value: string | null) {
  if (value === null) return "Not listed";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value));
}

async function fetchAllModelOptions(signal: AbortSignal) {
  const firstResponse = await fetch(`/api/models?limit=${PAGE_SIZE}&offset=0`, { signal });
  if (!firstResponse.ok) throw new Error("Could not load the model catalog.");
  const firstPage = await firstResponse.json() as ModelListResponse;
  const pageOffsets = Array.from(
    { length: Math.ceil(firstPage.pagination.total / PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * PAGE_SIZE,
  );
  const remainingPages = await Promise.all(pageOffsets.map(async (offset) => {
    const response = await fetch(`/api/models?limit=${PAGE_SIZE}&offset=${offset}`, { signal });
    if (!response.ok) throw new Error("Could not load the complete model catalog.");
    return response.json() as Promise<ModelListResponse>;
  }));
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

export default function ModelComparison() {
  const [catalog, setCatalog] = useState<ModelOption[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [candidateSlug, setCandidateSlug] = useState("");
  const [modelDetails, setModelDetails] = useState<Record<string, ComparisonModel>>({});
  const [loadingSlugs, setLoadingSlugs] = useState<string[]>([]);
  const [failedSlugs, setFailedSlugs] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllModelOptions(controller.signal)
      .then((models) => setCatalog(models))
      .catch(() => {
        if (!controller.signal.aborted) setCatalogStatus("error");
      })
      .then(() => {
        if (!controller.signal.aborted) setCatalogStatus((current) => current === "error" ? current : "ready");
      });
    return () => controller.abort();
  }, [catalogRetry]);

  async function loadModelDetail(slug: string) {
    setLoadingSlugs((current) => current.includes(slug) ? current : [...current, slug]);
    setFailedSlugs((current) => current.filter((item) => item !== slug));
    try {
      const response = await fetch(`/api/models/${encodeURIComponent(slug)}`);
      if (!response.ok) throw new Error("Could not load model details.");
      const result = await response.json() as { data: ComparisonModel };
      setModelDetails((current) => ({ ...current, [slug]: result.data }));
    } catch {
      setFailedSlugs((current) => current.includes(slug) ? current : [...current, slug]);
    } finally {
      setLoadingSlugs((current) => current.filter((item) => item !== slug));
    }
  }

  function addModel() {
    if (!candidateSlug || selectedSlugs.includes(candidateSlug) || selectedSlugs.length >= MAX_SELECTIONS) return;
    const slug = candidateSlug;
    setSelectedSlugs((current) => current.includes(slug) || current.length >= MAX_SELECTIONS ? current : [...current, slug]);
    setCandidateSlug("");
    if (!modelDetails[slug] && !loadingSlugs.includes(slug)) void loadModelDetail(slug);
  }

  function removeModel(slug: string) {
    setSelectedSlugs((current) => current.filter((item) => item !== slug));
  }

  const selectedOptions = useMemo(
    () => selectedSlugs.map((slug) => catalog.find((model) => model.slug === slug)).filter((model): model is ModelOption => Boolean(model)),
    [catalog, selectedSlugs],
  );

  const comparisonModels = useMemo(
    () => selectedSlugs.map((slug) => modelDetails[slug] ?? null),
    [modelDetails, selectedSlugs],
  );

  const benchmarkRows = useMemo(() => {
    const benchmarks = new Map<string, { name: string; category: string }>();
    comparisonModels.forEach((model) => model?.scores.forEach((score) => {
      const key = score.benchmark.name.trim().toLocaleLowerCase();
      if (!benchmarks.has(key)) benchmarks.set(key, { name: score.benchmark.name, category: score.benchmark.category });
    }));
    return [...benchmarks.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));
  }, [comparisonModels]);

  const optionsToAdd = catalog.filter((model) => !selectedSlugs.includes(model.slug));
  const anyDetailsLoading = selectedSlugs.some((slug) => loadingSlugs.includes(slug));
  const anyDetailsFailed = selectedSlugs.some((slug) => failedSlugs.includes(slug));
  const detailsReady = selectedSlugs.length >= 2 && comparisonModels.every(Boolean);

  return (
    <section className="model-comparison mx-auto w-full max-w-[1260px] px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="compare-page-title">
      <header className="comparison-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="section-eyebrow"><span className="pulse-dot" />MODEL WORKSPACE</p>
          <h1 id="compare-page-title">Compare models</h1>
          <p className="comparison-intro">Review capabilities, provider pricing, and benchmark results side by side.</p>
        </div>
        <div className="comparison-count"><Icon name="compare" size={17} /><span><strong>{selectedSlugs.length} / {MAX_SELECTIONS}</strong><small>models selected</small></span></div>
      </header>

      <div className="comparison-picker mt-7">
        <div className="comparison-picker-copy"><span className="picker-icon"><Icon name="models" size={17} /></span><span><strong>Add a model</strong><small>Select models from the live catalog to compare.</small></span></div>
        <div className="comparison-picker-actions">
          {catalogStatus === "loading" ? (
            <div className="picker-loading" aria-label="Loading model catalog"><span /><span /></div>
          ) : catalogStatus === "error" ? (
            <button type="button" className="secondary-button" onClick={() => { setCatalogStatus("loading"); setCatalogRetry((value) => value + 1); }}>Retry catalog</button>
          ) : catalog.length === 0 ? (
            <span className="picker-empty">No models are available in the catalog.</span>
          ) : (
            <>
              <select value={candidateSlug} onChange={(event) => setCandidateSlug(event.target.value)} aria-label="Choose a model to compare" disabled={selectedSlugs.length >= MAX_SELECTIONS || optionsToAdd.length === 0}>
                <option value="">Choose a model…</option>
                {optionsToAdd.map((model) => <option key={model.id} value={model.slug}>{model.company.name} · {model.name}</option>)}
              </select>
              <button type="button" className="primary-button" onClick={addModel} disabled={!candidateSlug || selectedSlugs.length >= MAX_SELECTIONS}><Icon name="compare" size={15} />Add model</button>
            </>
          )}
        </div>
      </div>

      {selectedOptions.length > 0 && (
        <div className="selected-model-list" aria-label="Selected models">
          {selectedOptions.map((model) => (
            <div className="selected-model-chip" key={model.slug}>
              <span className="selected-model-mark">{model.company.name.slice(0, 1).toUpperCase()}</span>
              <span><strong>{model.name}</strong><small>{model.company.name}</small></span>
              <button type="button" onClick={() => removeModel(model.slug)} aria-label={`Remove ${model.name}`}><Icon name="close" size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {catalogStatus === "loading" ? (
        <div className="comparison-state" aria-label="Loading model catalog" aria-busy="true"><div className="comparison-state-mark"><Icon name="models" size={21} /></div><h2>Loading the model catalog</h2><p>Fetching available models from OneAtlas.</p></div>
      ) : catalogStatus === "error" ? (
        <div className="comparison-state comparison-error" role="alert"><div className="comparison-state-mark"><Icon name="providers" size={21} /></div><h2>The model catalog couldn’t load</h2><p>Check your connection and retry the catalog request.</p><button type="button" className="primary-button" onClick={() => { setCatalogStatus("loading"); setCatalogRetry((value) => value + 1); }}>Try again</button></div>
      ) : catalog.length === 0 ? (
        <div className="comparison-state"><div className="comparison-state-mark"><Icon name="models" size={21} /></div><h2>No models available</h2><p>There are no models in the catalog to compare yet.</p></div>
      ) : selectedSlugs.length === 0 ? (
        <div className="comparison-state"><div className="comparison-state-mark"><Icon name="compare" size={21} /></div><h2>Start a model comparison</h2><p>Choose a model above. Add at least two models to see their specifications, provider pricing, and shared benchmark scores side by side.</p></div>
      ) : selectedSlugs.length === 1 ? (
        <div className="comparison-state comparison-one-selected"><div className="comparison-state-mark"><Icon name="compare" size={21} /></div><h2>Add one more model</h2><p>One model is selected. Add at least one more to start comparing.</p></div>
      ) : anyDetailsFailed ? (
        <div className="comparison-state comparison-error" role="alert"><div className="comparison-state-mark"><Icon name="providers" size={21} /></div><h2>Some model details couldn’t load</h2><p>Retry the detail request to finish loading this comparison.</p><button type="button" className="primary-button" onClick={() => selectedSlugs.filter((slug) => failedSlugs.includes(slug)).forEach((slug) => void loadModelDetail(slug))}>Retry details</button></div>
      ) : !detailsReady ? (
        <div className="comparison-state" aria-live="polite" aria-busy={anyDetailsLoading}><div className="comparison-state-mark"><Icon name="compare" size={21} /></div><h2>Loading comparison details</h2><p>Fetching provider prices and benchmark scores.</p></div>
      ) : (
        <>
          <div className="comparison-table-heading"><div><p className="detail-panel-eyebrow">SIDE-BY-SIDE VIEW</p><h2>Model specifications</h2></div><span>Provider prices stay attributed to each provider.</span></div>
          <div className="comparison-columns" style={{ "--comparison-columns": selectedSlugs.length } as CSSProperties}>
            {selectedSlugs.map((slug) => {
              const model = modelDetails[slug];
              if (!model) return null;
              const scoresByBenchmark = new Map(model.scores.map((score) => [score.benchmark.name.trim().toLocaleLowerCase(), score]));
              const providers = model.providers.filter((entry) => entry.available);
              return (
                <article className="comparison-model-column" key={model.id}>
                  <header className="comparison-model-header">
                    <div className="comparison-company-mark">{model.company.name.slice(0, 1).toUpperCase()}</div>
                    <p>{model.company.name}</p>
                    <h3>{model.name}</h3>
                    <span className={`discovery-type type-${model.type.toLowerCase()}`}>{modelTypeLabels[model.type]}</span>
                  </header>

                  <section className="comparison-metric"><span className="comparison-label"><Icon name="context" size={14} />Context window</span><strong>{formatContext(model.contextWindow)}</strong></section>
                  <section className="comparison-metric"><span className="comparison-label"><Icon name="layers" size={14} />Modalities</span><div className="comparison-chips">{model.modalities.length ? model.modalities.map((modality) => <span className="detail-chip modality-chip" key={modality}>{modality}</span>) : <span className="comparison-muted">Not listed</span>}</div></section>
                  <section className="comparison-metric"><span className="comparison-label"><Icon name="spark" size={14} />Capabilities</span><div className="comparison-chips">{model.capabilities.length ? model.capabilities.map((capability) => <span className="detail-chip" key={capability}>{capability}</span>) : <span className="comparison-muted">Not listed</span>}</div></section>

                  <section className="comparison-pricing-section">
                    <h4>Available providers & pricing</h4>
                    {providers.length === 0 ? <p className="comparison-muted">No available providers.</p> : providers.map((entry) => (
                      <div className="comparison-provider" key={entry.id}>
                        <div className="comparison-provider-name"><Icon name="providers" size={14} /><strong>{entry.provider.name}</strong></div>
                        <div><span>Input / 1M tokens</span><strong>{formatPrice(entry.inputPricePerMillion)}</strong></div>
                        <div><span>Output / 1M tokens</span><strong>{formatPrice(entry.outputPricePerMillion)}</strong></div>
                      </div>
                    ))}
                  </section>

                  <section className="comparison-benchmark-section">
                    <h4>Benchmark scores</h4>
                    {benchmarkRows.length === 0 ? <p className="comparison-muted">No benchmark scores.</p> : benchmarkRows.map(([key, benchmark]) => {
                      const score = scoresByBenchmark.get(key);
                      return <div className="comparison-benchmark-row" key={key}><span>{benchmark.name}</span><strong>{score ? Number(score.score).toLocaleString("en", { maximumFractionDigits: 2 }) : "—"}</strong></div>;
                    })}
                  </section>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
