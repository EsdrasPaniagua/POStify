import { Sidebar } from "@/src/components/Sidebar";
import { UserAdsBanner } from "@/src/components/UserAdsBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-16">
        {children}
      </main>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 border-t lg:left-64">
        <UserAdsBanner />
      </div>
    </div>
  );
}