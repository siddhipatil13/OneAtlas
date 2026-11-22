import { Suspense } from "react";
import ModelDetails from "@/components/model-details";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

async function ModelDetailContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ModelDetails key={slug} slug={slug} />;
}

function ModelDetailLoading() {
  return (
    <section className="model-detail-content" aria-label="Loading model details" aria-busy="true">
      <div className="detail-breadcrumb"><span>Model Discovery</span><span aria-hidden="true">/</span><span>Loading model…</span></div>
      <div className="detail-skeleton"><span /><span /><span /><span /><span /></div>
    </section>
  );
}

export default function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="app-shell">
      <Sidebar active="Models" />
      <div className="main-column">
        <Topbar context="Models" />
        <main className="dashboard-main detail-page-main">
          <Suspense fallback={<ModelDetailLoading />}>
            <ModelDetailContent params={params} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
