import AILabsDirectory from "@/components/ai-labs-directory";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export default function AILabsPage() {
  return (
    <div className="app-shell">
      <Sidebar active="AI Labs" />
      <div className="main-column">
        <Topbar context="AI Labs" />
        <main className="dashboard-main directory-page-main">
          <AILabsDirectory />
        </main>
      </div>
    </div>
  );
}
