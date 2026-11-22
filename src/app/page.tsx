import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

const metrics: { label: string; value: string; change: string; icon: IconName; tone: string }[] = [
  { label: "AI models tracked", value: "4,218", change: "+128 this month", icon: "models", tone: "violet" },
  { label: "Research labs", value: "86", change: "+6 this month", icon: "labs", tone: "blue" },
  { label: "Model providers", value: "32", change: "Across 18 regions", icon: "providers", tone: "mint" },
  { label: "Benchmarks indexed", value: "1,284", change: "Updated daily", icon: "rankings", tone: "amber" },
];

const featuredModels = [
  { initials: "A", brand: "anthropic", name: "Claude 3.7 Sonnet", type: "Reasoning", color: "anthropic", context: "200K", input: "$3.00", output: "$15.00", score: "92.4" },
  { initials: "O", brand: "openai", name: "GPT-4.1", type: "Multimodal", color: "openai", context: "1.04M", input: "$2.00", output: "$8.00", score: "90.8" },
  { initials: "G", brand: "google", name: "Gemini 2.5 Pro", type: "Reasoning", color: "google", context: "1M", input: "$1.25", output: "$10.00", score: "89.7" },
];

const leaders = [
  { place: "01", name: "Claude 3.7 Sonnet", company: "Anthropic", category: "Overall", score: "92.4", color: "anthropic" },
  { place: "02", name: "GPT-4.1", company: "OpenAI", category: "Coding", score: "90.8", color: "openai" },
  { place: "03", name: "Gemini 2.5 Pro", company: "Google DeepMind", category: "Reasoning", score: "89.7", color: "google" },
  { place: "04", name: "DeepSeek R1", company: "DeepSeek", category: "Math", score: "88.9", color: "deepseek" },
];

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

export default function Home() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <Topbar />
        <main className="dashboard-main">
          <section className="welcome-row">
            <div>
              <div className="welcome-kicker"><span className="pulse-dot" /> YOUR AI INTELLIGENCE WORKSPACE</div>
              <h1>See the whole <span>AI landscape.</span></h1>
              <p className="welcome-copy">Discover the right models, compare what matters, and keep up with the frontier.</p>
            </div>
            <Link className="primary-button" href="/models"><Icon name="spark" size={17} />Explore models<Icon name="arrow" size={15} /></Link>
          </section>

          <div className="snapshot-note"><span className="snapshot-mark"><Icon name="layers" size={14} /></span><span>Platform snapshot</span><span className="snapshot-separator">·</span><span>Sample data for the dashboard preview</span><span className="snapshot-date">Updated today <span className="status-dot" /></span></div>

          <section className="metrics-grid" aria-label="Platform overview">
            {metrics.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <div className="metric-top"><span className={`metric-icon ${metric.tone}`}><Icon name={metric.icon} size={18} /></span><span className="metric-trend"><span>↗</span>{metric.change}</span></div>
                <p className="metric-value">{metric.value}</p><p className="metric-label">{metric.label}</p>
              </article>
            ))}
          </section>

          <section className="models-section" id="model-spotlight">
            <SectionTitle eyebrow="THE FRONTIER" title="Models to know" href="/models" linkLabel="Explore catalog" />
            <div className="featured-grid">
              {featuredModels.map((model) => (
                <article className="featured-card" key={model.name}>
                  <div className="featured-top"><span className={`company-mark ${model.color}`}>{model.initials}</span><span className={`model-type ${model.type === "Reasoning" ? "reasoning" : "multimodal"}`}>{model.type}</span><button className="card-more" aria-label={`More about ${model.name}`}>···</button></div>
                  <p className="model-company">{model.brand}</p><h3>{model.name}</h3>
                  <div className="model-facts"><span><Icon name="context" size={14} />{model.context} context</span><span className="bench-score"><Icon name="rankings" size={14} />{model.score}</span></div>
                  <div className="price-row"><div><small>INPUT / 1M TOKENS</small><strong>{model.input}</strong></div><div><small>OUTPUT / 1M TOKENS</small><strong>{model.output}</strong></div><Link href="/models" aria-label={`View ${model.name}`} className="card-arrow"><Icon name="arrow" size={16} /></Link></div>
                </article>
              ))}
            </div>
          </section>

          <section className="lower-grid">
            <article className="leaderboard-panel">
              <SectionTitle eyebrow="PERFORMANCE INDEX" title="Leaderboard" href="/rankings" linkLabel="Full rankings" />
              <div className="leaderboard-table" role="table" aria-label="Top model rankings">
                <div className="leaderboard-head" role="row"><span>RANK / MODEL</span><span>CATEGORY</span><span>SCORE</span></div>
                {leaders.map((leader) => (
                  <div className="leaderboard-row" role="row" key={leader.place}>
                    <div className="leader-model"><span className="leader-rank">{leader.place}</span><span className={`leader-dot ${leader.color}`} /><span className="leader-model-copy"><strong>{leader.name}</strong><small>{leader.company}</small></span></div>
                    <span className="leader-category">{leader.category}</span>
                    <span className="leader-score">{leader.score}<span>/100</span></span>
                  </div>
                ))}
              </div>
              <div className="leaderboard-foot"><span><Icon name="clock" size={14} /> Scores normalized across benchmarks</span><Link href="/rankings">How rankings work <Icon name="arrow" size={13} /></Link></div>
            </article>

            <aside className="ecosystem-panel">
              <div className="ecosystem-heading"><div><p className="section-eyebrow">CONNECTED ECOSYSTEM</p><h2>Explore the network</h2></div><span className="orbit-icon"><Icon name="spark" size={19} /></span></div>
              <p className="ecosystem-copy">Models are only part of the picture. Follow the labs building them and the providers making them available.</p>
              <Link href="/ai-labs" className="ecosystem-link"><span className="ecosystem-link-icon labs-icon"><Icon name="labs" size={17} /></span><span><strong>AI Labs</strong><small>Research teams & releases</small></span><span className="ecosystem-link-count">86</span><Icon name="arrow" size={15} /></Link>
              <Link href="/providers" className="ecosystem-link"><span className="ecosystem-link-icon provider-icon"><Icon name="providers" size={17} /></span><span><strong>Providers</strong><small>Access & availability</small></span><span className="ecosystem-link-count">32</span><Icon name="arrow" size={15} /></Link>
              <div className="ecosystem-foot"><span className="status-dot" />Coverage across leading AI ecosystems</div>
            </aside>
          </section>

          <footer className="dashboard-footer"><span>OneAtlas <span className="footer-dot">·</span> AI, mapped.</span><span>Designed for builders, researchers, and curious minds.</span></footer>
        </main>
      </div>
    </div>
  );
}
