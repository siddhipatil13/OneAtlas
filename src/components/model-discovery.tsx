"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ModelType } from "@/generated/prisma/enums";
import { Icon } from "@/components/icon";

const PAGE_SIZE = 12;

type CompanySummary = { id: string; slug: string; name: string };
type ProviderSummary = { id: string; slug: string; name: string };
type ModelProvider = {
  provider: ProviderSummary;
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  available: boolean;
};
type ModelRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: ModelType;
  releaseDate: string | null;
  contextWindow: number | null;
  modalities: string[];
  capabilities: string[];
  featured: boolean;
  company: CompanySummary;
  providers: ModelProvider[];
};
type ModelListResponse = {
  data: ModelRecord[];
  pagination: { limit: number; offset: number; total: number };
};

const typeLabels: Partial<Record<ModelType, string>> = {
  TEXT: "Text",
  MULTIMODAL: "Multimodal",
  EMBEDDING: "Embedding",
  IMAGE: "Image",
  AUDIO: "Audio",
  VIDEO: "Video",
};

async function fetchModelCatalog(signal: AbortSignal) {
  const pageSize = 100;
  const firstResponse = await fetch(`/api/models?limit=${pageSize}&offset=0`, { signal });
  if (!firstResponse.ok) throw new Error("Could not load model filter options.");
  const firstPage = await firstResponse.json() as ModelListResponse;
  const offsets = Array.from(
    { length: Math.ceil(firstPage.pagination.total / pageSize) - 1 },
    (_, index) => (index + 1) * pageSize,
  );
  const remainingPages = await Promise.all(offsets.map(async (offset) => {
    const response = await fetch(`/api/models?limit=${pageSize}&offset=${offset}`, { signal });
    if (!response.ok) throw new Error("Could not load the complete model catalog.");
    return response.json() as Promise<ModelListResponse>;
  }));
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

function formatContext(value: number | null) {
  if (value === null) return "Not listed";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatReleaseDate(value: string | null) {
  if (!value) return "Not listed";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatPrice(value: string | null) {
  if (value === null) return "—";
  const numeric = Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: numeric < 1 ? 2 : 2,
    maximumFractionDigits: 4,
  }).format(numeric);
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function ModelDiscovery({ initialSearch = "" }: { initialSearch?: string }) {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [company, setCompany] = useState("");
  const [provider, setProvider] = useState("");
  const [modelType, setModelType] = useState<ModelType | "">("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [sort, setSort] = useState("releaseDate");
  const [page, setPage] = useState(1);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [catalog, setCatalog] = useState<ModelRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(false);
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    fetchModelCatalog(controller.signal)
      .then(setCatalog)
      .catch(() => {
        if (!controller.signal.aborted) setCatalog([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      sort,
    });
    if (search) params.set("search", search);
    if (company) params.set("company", company);
    if (provider) params.set("provider", provider);
    if (modelType) params.set("type", modelType);
    capabilities.forEach((capability) => params.append("capability", capability));

    fetch(`/api/models?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load models.");
        return response.json() as Promise<ModelListResponse>;
      })
      .then((result) => {
        setModels(result.data);
        setTotal(result.pagination.total);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [search, company, provider, modelType, capabilities, sort, page, reloadKey]);

  const companies = useMemo(() => {
    const items = new Map<string, CompanySummary>();
    catalog.forEach((model) => items.set(model.company.slug, model.company));
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog]);

  const providers = useMemo(() => {
    const items = new Map<string, ProviderSummary>();
    catalog.forEach((model) => model.providers.forEach(({ provider: item }) => items.set(item.slug, item)));
    return [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog]);

  const capabilityOptions = useMemo(() => {
    return [...new Set(catalog.flatMap((model) => model.capabilities))].sort((a, b) => a.localeCompare(b));
  }, [catalog]);

  const modelTypes = useMemo(() => {
    return [...new Set(catalog.map((model) => model.type))].sort((a, b) =>
      (typeLabels[a] ?? a).localeCompare(typeLabels[b] ?? b),
    );
  }, [catalog]);

  const retry = useCallback(() => {
    setLoading(true);
    setCatalogLoading(true);
    setError(false);
    setReloadKey((current) => current + 1);
  }, []);
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);
  const hasFilters = Boolean(search || company || provider || modelType || capabilities.length);

  function toggleCapability(value: string) {
    setLoading(true);
    setError(false);
    setPage(1);
    setCapabilities((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCompany("");
    setProvider("");
    setModelType("");
    setCapabilities([]);
    setPage(1);
    setLoading(true);
    setError(false);
  }

  return (
    <section className="model-discovery mx-auto w-full max-w-[1260px] px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="model-page-title">
      <div className="discovery-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="section-eyebrow"><span className="pulse-dot" />MODEL CATALOG</p>
          <h1 id="model-page-title">Discover AI models</h1>
          <p className="discovery-intro">Compare capabilities, context, pricing, and access across leading models.</p>
        </div>
        <div className="catalog-total" aria-live="polite">
          <span className="catalog-total-mark"><Icon name="models" size={18} /></span>
          <span><strong>{loading ? "…" : total.toLocaleString()}</strong><small>models in catalog</small></span>
        </div>
      </div>

      <div className="discovery-controls mt-7">
        <label className="discovery-search">
          <Icon name="search" size={18} />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search models by name..."
            aria-label="Search models by name"
          />
          {searchInput && <button type="button" onClick={() => setSearchInput("")} aria-label="Clear search"><Icon name="close" size={15} /></button>}
        </label>

        <div className="discovery-filter-row">
          <label className="discovery-select-wrap">
            <span>Company</span>
            <select value={company} onChange={(event) => { setLoading(true); setError(false); setPage(1); setCompany(event.target.value); }} aria-label="Filter by company">
              <option value="">All companies</option>
              {companies.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
          </label>

          <label className="discovery-select-wrap">
            <span>Provider</span>
            <select value={provider} onChange={(event) => { setLoading(true); setError(false); setPage(1); setProvider(event.target.value); }} aria-label="Filter by provider">
              <option value="">All providers</option>
              {providers.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
          </label>

          <label className="discovery-select-wrap">
            <span>Model type</span>
            <select
              value={modelType}
              disabled={catalogLoading || modelTypes.length === 0}
              onChange={(event) => {
                setLoading(true);
                setError(false);
                setPage(1);
                setModelType(event.target.value as ModelType | "");
              }}
              aria-label="Filter by model type"
            >
              <option value="">All model types</option>
              {modelTypes.map((item) => <option key={item} value={item}>{typeLabels[item] ?? item}</option>)}
            </select>
          </label>

          <details className="capability-filter">
            <summary><Icon name="filter" size={15} /><span>Capabilities</span>{capabilities.length > 0 && <b>{capabilities.length}</b>}<Icon name="chevron" size={14} /></summary>
            <div className="capability-menu">
              {catalogLoading ? <p className="filter-hint">Loading available capabilities…</p> : capabilityOptions.length === 0 ? <p className="filter-hint">No capabilities available yet.</p> : capabilityOptions.map((item) => (
                <label key={item} className="capability-option">
                  <input type="checkbox" checked={capabilities.includes(item)} onChange={() => toggleCapability(item)} />
                  <span>{item}</span>
                </label>
              ))}
              {capabilities.length > 0 && <button type="button" className="clear-capabilities" onClick={() => { setLoading(true); setError(false); setPage(1); setCapabilities([]); }}>Clear selection</button>}
            </div>
          </details>

          <label className="discovery-select-wrap sort-select-wrap">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => { setLoading(true); setError(false); setPage(1); setSort(event.target.value); }} aria-label="Sort models">
              <option value="releaseDate">Latest release</option>
              <option value="inputPrice">Input price · low to high</option>
              <option value="outputPrice">Output price · low to high</option>
              <option value="contextWindow">Context window · largest</option>
            </select>
          </label>
        </div>

        {hasFilters && <div className="active-filters"><span>Filtered results</span><button type="button" onClick={clearFilters}>Clear all <Icon name="close" size={13} /></button></div>}
      </div>

      <div className="discovery-results-bar">
        <p>{loading ? "Finding models…" : total === 0 ? "No models found" : <>Showing <strong>{pageStart}–{pageEnd}</strong> of <strong>{total}</strong> models</>}</p>
        {capabilities.length > 0 && <span>{capabilities.join(" · ")}</span>}
      </div>

      {error ? (
        <div className="discovery-state discovery-error" role="alert">
          <span className="state-icon"><Icon name="providers" size={22} /></span>
          <h2>Models couldn’t load</h2>
          <p>There was a problem reaching the model catalog. Check your connection and try again.</p>
          <button type="button" className="primary-button" onClick={retry}>Try again</button>
        </div>
      ) : loading ? (
        <div className="model-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading models" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => <div className="model-skeleton" key={index}><span /><span /><span /><span /></div>)}
        </div>
      ) : models.length === 0 ? (
        <div className="discovery-state discovery-empty">
          <span className="state-icon"><Icon name="search" size={22} /></span>
          <h2>No models match these filters</h2>
          <p>Try a different search or remove a filter to see more of the catalog.</p>
          <button type="button" className="secondary-button" onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div className="model-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {models.map((model) => {
            const availableProviders = model.providers.filter((item) => item.available);
            return (
              <Link href={`/models/${encodeURIComponent(model.slug)}`} className="discovery-card-link" key={model.id} aria-label={`View details for ${model.name}`}>
              <article className="discovery-model-card flex flex-col">
                <div className="model-card-topline">
                  <span className="company-avatar">{initials(model.company.name)}</span>
                  <span className="company-name">{model.company.name}</span>
                  {model.featured && <span className="featured-label"><Icon name="spark" size={12} />Featured</span>}
                </div>
                <div className="discovery-model-title">
                  <div><h2>{model.name}</h2><p>{model.slug}</p></div>
                  <span className={`discovery-type type-${model.type.toLowerCase()}`}>{typeLabels[model.type] ?? model.type}</span>
                </div>
                <p className="discovery-model-description">{model.description}</p>

                <div className="model-spec-row">
                  <div className="model-spec"><span><Icon name="context" size={14} />Context</span><strong>{formatContext(model.contextWindow)}<small>{model.contextWindow ? " tokens" : ""}</small></strong></div>
                  <div className="model-spec"><span><Icon name="clock" size={14} />Released</span><strong>{formatReleaseDate(model.releaseDate)}</strong></div>
                </div>

                <div className="model-capabilities" aria-label="Capabilities">
                  {model.capabilities.length > 0 ? model.capabilities.map((item) => <span className="capability-chip" key={item}>{item}</span>) : <span className="capability-chip muted-chip">No capabilities listed</span>}
                </div>

                <div className="model-pricing-row">
                  <div><span>Input / 1M tokens · from</span><strong>{formatPrice(availableProviders.map((item) => item.inputPricePerMillion).filter((value): value is string => value !== null).sort((a, b) => Number(a) - Number(b))[0] ?? null)}</strong></div>
                  <div><span>Output / 1M tokens · from</span><strong>{formatPrice(availableProviders.map((item) => item.outputPricePerMillion).filter((value): value is string => value !== null).sort((a, b) => Number(a) - Number(b))[0] ?? null)}</strong></div>
                </div>

                <div className="model-provider-row">
                  <span>Available on</span>
                  <div>{availableProviders.length > 0 ? availableProviders.map((item) => <span className="provider-pill" key={item.provider.id}>{item.provider.name}</span>) : <span className="no-providers">No active providers</span>}</div>
                </div>
              </article>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && !error && maxPage > 1 && (
        <nav className="discovery-pagination" aria-label="Model results pages">
          <span>Page {page} of {maxPage}</span>
          <div>
            <button type="button" className="secondary-button" onClick={() => { setLoading(true); setError(false); setPage((current) => Math.max(1, current - 1)); }} disabled={page <= 1}>Previous</button>
            <button type="button" className="secondary-button" onClick={() => { setLoading(true); setError(false); setPage((current) => Math.min(maxPage, current + 1)); }} disabled={page >= maxPage}>Next</button>
          </div>
        </nav>
      )}
    </section>
  );
}
