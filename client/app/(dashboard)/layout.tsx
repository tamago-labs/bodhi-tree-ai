'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AgentProvider } from '@/contexts/AgentContext';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if we're on the playground page
  const isPlaygroundPage = (pathname === '/playground' || pathname === "/");

  return (
    <AgentProvider>
      <div className="min-h-screen bg-orange-50 flex">
        <Sidebar />
        <main className={`flex-1 ${isPlaygroundPage ? 'h-screen overflow-hidden' : 'lg:ml-64'}`}>
          {isPlaygroundPage ? (
            // Full-screen layout for playground
            <div className="h-full">
              {children}
            </div>
          ) : (
            // Regular layout with padding for other pages
            <div className="p-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </AgentProvider>
  );
}
