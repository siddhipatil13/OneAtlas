"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import ThemeToggle from "@/components/theme-toggle";

export default function Topbar({ context = "Overview" }: { context?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchInput.current?.focus());
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/models?search=${encodeURIComponent(query)}` : "/models");
    setSearchOpen(false);
  }

  function openSearch() {
    setSearchOpen(true);
    window.requestAnimationFrame(() => searchInput.current?.focus());
  }

  return (
    <header className="topbar">
      <div className="topbar-context"><span>Workspace</span><span className="crumb-slash">/</span><strong>{context}</strong></div>
      <div className="topbar-actions">
        <form className={`global-search${searchOpen ? " search-open" : ""}`} role="search" onSubmit={submitSearch}>
          <button type="button" className="global-search-trigger" aria-label="Search models" onClick={openSearch}>
            <Icon name="search" size={17} />
          </button>
          <input ref={searchInput} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search models..." aria-label="Search models" />
          <kbd>Ctrl / ⌘ K</kbd>
        </form>
        <span className="topbar-divider" />
        <ThemeToggle />
        <button className="icon-button notification-button" aria-label="Notifications">
          <Icon name="bell" size={18} /><span className="notification-dot" />
        </button>
        <Link href="/" className="topbar-avatar" aria-label="Account menu">NP</Link>
      </div>
    </header>
  );
}
