import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";

const primaryLinks: { label: string; href: string; icon: IconName; active?: boolean }[] = [
  { label: "Dashboard", href: "/", icon: "dashboard", active: true },
  { label: "Models", href: "/models", icon: "models" },
  { label: "Compare", href: "/compare", icon: "compare" },
  { label: "Rankings", href: "/rankings", icon: "rankings" },
];

const ecosystemLinks: { label: string; href: string; icon: IconName }[] = [
  { label: "AI Labs", href: "/ai-labs", icon: "labs" },
  { label: "Providers", href: "/providers", icon: "providers" },
];

function Brand() {
  return (
    <Link href="/" className="brand" aria-label="OneAtlas home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="brand-name">oneatlas<span>.</span></span>
    </Link>
  );
}

function NavGroup({
  label,
  items,
  activeLabel,
}: {
  label: string;
  items: typeof primaryLinks;
  activeLabel: string;
}) {
  return (
    <div className="nav-group">
      <p className="nav-group-label">{label}</p>
      <nav aria-label={label} className="nav-list">
        {items.map((item) => (
          <Link
            href={item.href}
            key={item.label}
            className={`nav-link${item.label === activeLabel ? " active" : ""}`}
            aria-current={item.label === activeLabel ? "page" : undefined}
          >
            <Icon name={item.icon} size={17} />
            <span>{item.label}</span>
            {item.label === "Compare" && <span className="nav-count">0</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar({ active = "Dashboard" }: { active?: string }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Brand />
        <div className="workspace-switcher">
          <span className="workspace-avatar">O</span>
          <span className="workspace-copy"><strong>OneAtlas</strong><small>Personal workspace</small></span>
          <Icon name="chevron" size={15} className="muted-icon" />
        </div>
        <NavGroup label="DISCOVER" items={primaryLinks} activeLabel={active} />
        <NavGroup label="ECOSYSTEM" items={ecosystemLinks} activeLabel={active} />
      </div>
      <div className="sidebar-bottom">
        <div className="data-status"><span className="status-dot" /><span>Demo data snapshot</span><span className="status-time">Today</span></div>
        <div className="profile-row">
          <span className="profile-avatar">NP</span>
          <span className="profile-copy"><strong>Workspace owner</strong><small>Free plan</small></span>
          <button className="icon-button profile-menu" aria-label="Workspace options"><span>···</span></button>
        </div>
      </div>
    </aside>
  );
}
