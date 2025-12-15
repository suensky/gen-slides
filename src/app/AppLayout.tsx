import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { usePresentationStore } from '../store/usePresentationStore';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  const history = usePresentationStore((s) => s.history);
  const isSidebarCollapsed = usePresentationStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = usePresentationStore((s) => s.toggleSidebar);
  const deleteFromHistory = usePresentationStore((s) => s.deletePresentation);
  const setCurrentPresentation = usePresentationStore((s) => s.setCurrentPresentation);

  return (
    <div className="h-full w-full flex">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        history={history}
        onLoadHistory={(presentation) => {
          setCurrentPresentation(presentation);
          navigate(`/presentations/${presentation.id}/slides`);
        }}
        onDeleteHistory={(id) => void deleteFromHistory(id)}
        onNewChat={() => {
          setCurrentPresentation(null);
          navigate('/');
        }}
      />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
