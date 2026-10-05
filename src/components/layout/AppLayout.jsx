import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

/** Global shell for every signed-in page: sidebar + header + routed content. */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-shell__main">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main id="main" className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
