"use client";

import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { useStoreUser } from "@/hooks/use-store-user";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  useStoreUser();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
