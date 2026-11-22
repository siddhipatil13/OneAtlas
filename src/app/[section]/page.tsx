import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import ModelDiscovery from "@/components/model-discovery";
import ModelComparison from "@/components/model-comparison";
import BenchmarkRankings from "@/components/benchmark-rankings";
import AILabsDirectory from "@/components/ai-labs-directory";
import ProvidersDirectory from "@/components/providers-directory";

type SectionSearchParams = PageProps<"/[section]">["searchParams"];

async function ModelDiscoveryWithQuery({ searchParams }: { searchParams: SectionSearchParams }) {
  const query = await searchParams;
  const initialSearch = Array.isArray(query.search) ? query.search[0] ?? "" : query.search ?? "";
  return <ModelDiscovery initialSearch={initialSearch} />;
}

const sections: Record<string, { title: string; description: string; icon: "models" | "compare" | "rankings" | "labs" | "providers" }> = {
  models: { title: "Model discovery", description: "Search, filter, and explore the models shaping the AI landscape.", icon: "models" },
  compare: { title: "Model comparison", description: "Compare model specifications, pricing, modalities, and benchmark results side by side.", icon: "compare" },
  rankings: { title: "Rankings & benchmarks", description: "Explore model performance across the benchmarks that matter to your work.", icon: "rankings" },
  labs: { title: "AI labs", description: "Discover the research organizations building frontier AI models.", icon: "labs" },
  providers: { title: "Providers", description: "Find where models are available and learn about the infrastructure behind them.", icon: "providers" },
};

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function SectionPage({ params, searchParams }: PageProps<"/[section]">) {
  const { section } = await params;
  const details = sections[section];
  if (!details) notFound();

  const activeLabel = section === "labs" ? "AI Labs" : details.title === "Model discovery" ? "Models" : details.title === "Model comparison" ? "Compare" : details.title === "Rankings & benchmarks" ? "Rankings" : "Providers";

  return (
    <div className="app-shell">
      <Sidebar active={activeLabel} />
      <div className="main-column">
        <Topbar context={section === "models" ? "Models" : section === "compare" ? "Compare" : section === "rankings" ? "Rankings" : section === "labs" ? "AI Labs" : section === "providers" ? "Providers" : "Overview"} />
        <main className={`dashboard-main ${section === "models" ? "discovery-page-main" : section === "compare" ? "comparison-page-main" : section === "rankings" ? "rankings-page-main" : section === "labs" || section === "providers" ? "directory-page-main" : "module-main"}`}>
          {section === "models" ? <Suspense fallback={<ModelDiscovery />}><ModelDiscoveryWithQuery searchParams={searchParams} /></Suspense> : section === "compare" ? <ModelComparison /> : section === "rankings" ? <BenchmarkRankings /> : section === "labs" ? <AILabsDirectory /> : section === "providers" ? <ProvidersDirectory /> : (
            <div className="coming-soon-card">
              <span className="coming-soon-icon"><Icon name={details.icon} size={23} /></span>
              <p className="section-eyebrow">ONEATLAS WORKSPACE</p>
              <h1>{details.title}</h1>
              <p>{details.description}</p>
              <span className="coming-soon-tag"><span className="status-dot" />Module coming in the next phase</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
