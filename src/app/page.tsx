import DashboardOverview from "@/components/dashboard-overview";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";

export default function Home() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <Topbar />
        <DashboardOverview />
      </div>
    </div>
  );
}
