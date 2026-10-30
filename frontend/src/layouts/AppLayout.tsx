import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useShopfloor } from '../context/ShopfloorContext.js';
import { Sidebar, type ActiveTab } from '../components/layout/Sidebar.js';
import { Header } from '../components/layout/Header.js';
import { AndonTopBanner } from '../components/layout/AndonTopBanner.js';
import { CreateAndonModal } from '../components/andon/CreateAndonModal.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const getActiveTabFromPath = (pathname: string): ActiveTab => {
  if (pathname === '/' || pathname === '/overview') return 'overview';
  if (pathname.startsWith('/shopfloor')) return 'shopfloor';
  if (pathname.startsWith('/machines')) return 'machines';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/scheduling')) return 'scheduling';
  if (pathname.startsWith('/packaging')) return 'packaging';
  if (pathname.startsWith('/quality')) return 'quality';
  if (pathname.startsWith('/traveler')) return 'traveler';
  if (pathname.startsWith('/materials')) return 'materials';
  if (pathname.startsWith('/maintenance')) return 'maintenance';
  if (pathname.startsWith('/andon')) return 'andon';
  if (pathname.startsWith('/oee')) return 'oee';
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/admin')) return 'admin';
  return 'overview';
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  const {
    tickets,
    isLoading,
    fetchError,
    connected,
    latencyMs,
    openTickets,
    selectedMachineForAndon,
    setSelectedMachineForAndon,
    refreshData,
    handleAcknowledgeAndon,
    handleSubmitAndon,
  } = useShopfloor();

  const activeTab = getActiveTabFromPath(location.pathname);

  const handleTabChange = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview':
        void navigate('/');
        break;
      case 'shopfloor':
        void navigate('/shopfloor');
        break;
      case 'machines':
        void navigate('/machines');
        break;
      case 'orders':
        void navigate('/orders');
        break;
      case 'scheduling':
        void navigate('/scheduling');
        break;
      case 'packaging':
        void navigate('/packaging');
        break;
      case 'quality':
        void navigate('/quality');
        break;
      case 'traveler':
        void navigate('/traveler');
        break;
      case 'materials':
        void navigate('/materials');
        break;
      case 'maintenance':
        void navigate('/maintenance');
        break;
      case 'andon':
        void navigate('/andon');
        break;
      case 'oee':
        void navigate('/oee');
        break;
      case 'analytics':
        void navigate('/analytics');
        break;
      case 'admin':
        void navigate('/admin');
        break;
      default:
        void navigate('/');
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-[#F8F8F8] text-[#292A2E] flex font-sans overflow-hidden">
      {/* Atlassian Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        openTicketsCount={openTickets.length}
        connected={connected}
        latencyMs={latencyMs}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onToggleMobile={() => setIsMobileNavOpen((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          connected={connected}
          latencyMs={latencyMs}
          openTicketsCount={openTickets.length}
          onNavigateToAndon={() => void navigate('/andon')}
        />

        {/* Active Andon Alert Top Banner */}
        <AndonTopBanner
          tickets={tickets}
          onAcknowledge={handleAcknowledgeAndon}
          onNavigateToAndon={() => void navigate('/andon')}
        />

        {/* Main Content View Outlet */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overscroll-contain w-full px-4 sm:px-6 lg:px-8 py-6"
        >
          {fetchError && (
            <div className="mb-6 p-4 rounded-lg bg-[#FFECEB] border border-[#E2483D] text-[#292A2E] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-[#C9372C] flex-shrink-0" />
                <span className="text-sm font-medium">{fetchError}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshData()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#FFFFFF] hover:bg-[#F8F8F8] text-[#292A2E] border border-[#0B120E24] transition-colors shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#505258] space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-[#1868DB]" />
              <p className="text-sm font-medium">Connecting to shop floor ingestion engine...</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Operator Call-for-Help Modal */}
      <CreateAndonModal
        isOpen={Boolean(selectedMachineForAndon)}
        onClose={() => setSelectedMachineForAndon(null)}
        machine={selectedMachineForAndon}
        onSubmit={handleSubmitAndon}
      />
    </div>
  );
};
