"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";

const PAGE_SIZE = 100;

type CompanyRecord = {
  id: string;
  slug: string;
  name: string;
  type: "COMPANY" | "RESEARCH_LAB" | "BOTH";
  description: string;
  website: string | null;
  headquarters: string | null;
  models: {
    id: string;
    slug: string;
    name: string;
    type: string;
    contextWindow: number | null;
    capabilities: string[];
  }[];
};

type CompanyListResponse = {
  data: CompanyRecord[];
  pagination: { limit: number; offset: number; total: number };
};

async function fetchAllCompanies(signal: AbortSignal) {
  const firstResponse = await fetch(`/api/companies?limit=${PAGE_SIZE}&offset=0`, { signal });
  if (!firstResponse.ok) throw new Error("Could not load the company directory.");
  const firstPage = await firstResponse.json() as CompanyListResponse;
  const offsets = Array.from(
    { length: Math.ceil(firstPage.pagination.total / PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * PAGE_SIZE,
  );
  const remainingPages = await Promise.all(offsets.map(async (offset) => {
    const response = await fetch(`/api/companies?limit=${PAGE_SIZE}&offset=${offset}`, { signal });
    if (!response.ok) throw new Error("Could not load the complete company directory.");
    return response.json() as Promise<CompanyListResponse>;
  }));
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
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

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

const organizationTypeLabels: Record<CompanyRecord["type"], string> = {
  COMPANY: "Company",
  RESEARCH_LAB: "Research lab",
  BOTH: "Company & research lab",
};

export default function AILabsDirectory() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllCompanies(controller.signal)
      .then((records) => {
        setCompanies(records);
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

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return companies;
    return companies.filter((company) => company.name.toLocaleLowerCase().includes(query));
  }, [companies, search]);

  const modelCount = useMemo(
    () => companies.reduce((total, company) => total + company.models.length, 0),
    [companies],
  );

  function retry() {
    setLoading(true);
    setError(false);
    setRetryKey((current) => current + 1);
  }

  return (
    <section className="ai-labs-directory mx-auto w-full max-w-[1260px] px-4 py-7 sm:px-6 lg:px-8" aria-labelledby="labs-page-title">
      <header className="labs-directory-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="section-eyebrow"><span className="pulse-dot" />AI ECOSYSTEM</p>
          <h1 id="labs-page-title">AI labs & companies</h1>
          <p className="labs-directory-intro">Explore the organizations building the models shaping AI.</p>
        </div>
        {!loading && !error && companies.length > 0 && (
          <div className="labs-directory-stats">
            <div><strong>{companies.length}</strong><small>organizations</small></div>
            <span />
            <div><strong>{modelCount}</strong><small>associated models</small></div>
          </div>
        )}
      </header>

      <div className="labs-search-panel mt-7">
        <label className="labs-search-field">
          <Icon name="search" size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search AI labs and companies..."
            aria-label="Search companies by name"
          />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear company search"><Icon name="close" size={14} /></button>}
        </label>
        {!loading && !error && <span className="labs-results-count">{filteredCompanies.length} {filteredCompanies.length === 1 ? "organization" : "organizations"}</span>}
      </div>

      {loading ? (
        <div className="labs-directory-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading AI labs" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => <div className="lab-card-skeleton" key={index}><span /><span /><span /><span /></div>)}
        </div>
      ) : error ? (
        <div className="labs-directory-state" role="alert">
          <span className="labs-state-icon"><Icon name="providers" size={22} /></span>
          <h2>The directory couldn’t load</h2>
          <p>There was a problem reaching the company catalog. Check your connection and try again.</p>
          <button type="button" className="primary-button" onClick={retry}>Try again</button>
        </div>
      ) : companies.length === 0 ? (
        <div className="labs-directory-state">
          <span className="labs-state-icon"><Icon name="labs" size={22} /></span>
          <h2>No organizations available</h2>
          <p>Company and lab records will appear here when they are added to OneAtlas.</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="labs-directory-state labs-no-results">
          <span className="labs-state-icon"><Icon name="search" size={22} /></span>
          <h2>No organizations match “{search.trim()}”</h2>
          <p>Check the spelling or try another company name.</p>
          <button type="button" className="secondary-button" onClick={() => setSearch("")}>Clear search</button>
        </div>
      ) : (
        <div className="labs-directory-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {filteredCompanies.map((company) => {
            const website = getSafeWebsite(company.website);
            return (
              <article className="lab-directory-card flex flex-col" key={company.id}>
                <header className="lab-card-header">
                  <span className="lab-company-mark">{getInitials(company.name)}</span>
                  <span className="lab-type-badge">{organizationTypeLabels[company.type]}</span>
                </header>
                <h2>{company.name}</h2>
                {company.headquarters && <p className="lab-headquarters"><Icon name="labs" size={13} />{company.headquarters}</p>}
                <p className="lab-company-description">{company.description}</p>
                <div className="lab-card-meta">
                  <span><Icon name="models" size={14} />{company.models.length} {company.models.length === 1 ? "model" : "models"}</span>
                  {website ? <a href={website.href} target="_blank" rel="noreferrer">{website.hostname}<Icon name="arrow" size={12} /></a> : <span className="lab-website-missing">Website not listed</span>}
                </div>
                <section className="lab-associated-models" aria-label={`Models by ${company.name}`}>
                  <h3>Associated models</h3>
                  {company.models.length === 0 ? (
                    <p className="lab-no-models">No models cataloged yet.</p>
                  ) : (
                    <ul>
                      {company.models.map((model) => (
                        <li key={model.id}><Link href={`/models/${encodeURIComponent(model.slug)}`}><span>{model.name}</span><Icon name="arrow" size={13} /></Link></li>
                      ))}
                    </ul>
                  )}
                </section>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
