"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

const PAGE_SIZE = 100;

type ProviderRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  region: string | null;
  company: { id: string; slug: string; name: string } | null;
  models: {
    id: string;
    available: boolean;
    inputPricePerMillion: number | string | null;
    outputPricePerMillion: number | string | null;
    model: {
      id: string;
      slug: string;
      name: string;
      type: string;
      contextWindow: number | null;
      capabilities: string[];
    };
  }[];
};

type ProviderResponse = {
  data: ProviderRecord[];
  pagination: { limit: number; offset: number; total: number };
};

async function fetchAllProviders(signal: AbortSignal) {
  const firstResponse = await fetch(`/api/providers?limit=${PAGE_SIZE}&offset=0`, { signal });
  if (!firstResponse.ok) throw new Error("Could not load the provider directory.");
  const firstPage = await firstResponse.json() as ProviderResponse;
  const offsets = Array.from(
    { length: Math.ceil(firstPage.pagination.total / PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * PAGE_SIZE,
  );
  const remainingPages = await Promise.all(offsets.map(async (offset) => {
    const response = await fetch(`/api/providers?limit=${PAGE_SIZE}&offset=${offset}`, { signal });
    if (!response.ok) throw new Error("Could not load the complete provider directory.");
    return response.json() as Promise<ProviderResponse>;
  }));
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

function formatPrice(value: number | string | null) {
  if (value === null) return "Not listed";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not listed";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 6 }).format(amount);
}

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function getSafeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export default function ProvidersDirectory() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllProviders(controller.signal)
      .then((records) => {
        setProviders(records);
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

  const filteredProviders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return providers;
    return providers.filter((provider) => provider.name.toLocaleLowerCase().includes(query));
  }, [providers, search]);

  const availableModelCount = useMemo(
    () => providers.reduce((total, provider) => total + provider.models.filter((entry) => entry.available).length, 0),
    [providers],
  );

  function retry() {
    setLoading(true);
    setError(false);
    setRetryKey((current) => current + 1);
  }

  return (
    <section className="providers-directory mx-auto w-full max-w-[1260px] px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="providers-page-title">
      <header className="providers-directory-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="section-eyebrow"><span className="pulse-dot" />ACCESS & INFRASTRUCTURE</p>
          <h1 id="providers-page-title">AI providers</h1>
          <p className="providers-directory-intro">See where models are available and compare provider specific pricing.</p>
        </div>
        {!loading && !error && providers.length > 0 && (
          <div className="providers-directory-stats">
            <div><strong>{providers.length}</strong><small>providers</small></div>
            <span />
            <div><strong>{availableModelCount}</strong><small>available model offers</small></div>
          </div>
        )}
      </header>

      <div className="providers-search-panel mt-7">
        <label className="providers-search-field">
          <Icon name="search" size={17} />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search providers..." aria-label="Search providers by name" />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear provider search"><Icon name="close" size={14} /></button>}
        </label>
        {!loading && !error && <span className="providers-results-count">{filteredProviders.length} {filteredProviders.length === 1 ? "provider" : "providers"}</span>}
      </div>

      {loading ? (
        <div className="providers-directory-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading providers" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => <div className="provider-card-skeleton" key={index}><span /><span /><span /><span /></div>)}
        </div>
      ) : error ? (
        <div className="providers-directory-state" role="alert">
          <span className="providers-state-icon"><Icon name="providers" size={22} /></span>
          <h2>The provider directory couldn’t load</h2>
          <p>There was a problem reaching the provider catalog. Check your connection and try again.</p>
          <button type="button" className="primary-button" onClick={retry}>Try again</button>
        </div>
      ) : providers.length === 0 ? (
        <div className="providers-directory-state">
          <span className="providers-state-icon"><Icon name="providers" size={22} /></span>
          <h2>No providers available</h2>
          <p>Provider records will appear here when they are added to OneAtlas.</p>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="providers-directory-state">
          <span className="providers-state-icon"><Icon name="search" size={22} /></span>
          <h2>No providers match “{search.trim()}”</h2>
          <p>Check the spelling or try another provider name.</p>
          <button type="button" className="secondary-button" onClick={() => setSearch("")}>Clear search</button>
        </div>
      ) : (
        <div className="providers-directory-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {filteredProviders.map((provider) => {
            const website = getSafeWebsite(provider.website);
            const availableCount = provider.models.filter((entry) => entry.available).length;
            return (
              <article className="provider-directory-card flex flex-col" key={provider.id}>
                <header className="provider-card-header">
                  <span className="provider-company-mark">{getInitials(provider.name)}</span>
                  <span className="provider-model-count">{availableCount} available {availableCount === 1 ? "model" : "models"}</span>
                </header>
                <h2>{provider.name}</h2>
                {(provider.company || provider.region) && <p className="provider-affiliation"><Icon name="labs" size={13} />{[provider.company?.name, provider.region].filter(Boolean).join(" · ")}</p>}
                {provider.description && <p className="provider-description">{provider.description}</p>}
                <div className="provider-card-meta">
                  {website ? <a href={website.href} target="_blank" rel="noreferrer">{website.hostname}<Icon name="arrow" size={12} /></a> : <span>Website not listed</span>}
                  <span>{provider.models.length} {provider.models.length === 1 ? "offer" : "offers"}</span>
                </div>
                <section className="provider-associated-models" aria-label={`Models available through ${provider.name}`}>
                  <h3>Models & provider pricing</h3>
                  {provider.models.length === 0 ? (
                    <p className="provider-no-models">No models cataloged yet.</p>
                  ) : (
                    <ul>
                      {provider.models.map((entry) => (
                        <li key={entry.id}>
                          <div className="provider-model-heading">
                            <Link href={`/models/${encodeURIComponent(entry.model.slug)}`}>{entry.model.name}<Icon name="arrow" size={12} /></Link>
                            <span className={`provider-availability${entry.available ? "" : " unavailable"}`}>{entry.available ? "Available" : "Unavailable"}</span>
                          </div>
                          <div className="provider-model-prices">
                            <span>Input / 1M <strong>{formatPrice(entry.inputPricePerMillion)}</strong></span>
                            <span>Output / 1M <strong>{formatPrice(entry.outputPricePerMillion)}</strong></span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <p className="provider-price-note">USD per 1M tokens. Prices are specific to {provider.name}.</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
