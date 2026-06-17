import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import GlobalSearchModal from './GlobalSearchModal';
import layoutStyles from './DashboardLayout.module.css';

export default function DashboardLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        // Load sidebar collapse preference
        const collapsedPref = localStorage.getItem('sidebar_collapsed');
        setSidebarCollapsed(collapsedPref === 'true');
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchOpen(open => !open);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleSidebar = () => {
        if (window.innerWidth <= 768) {
            setSidebarOpen(!isSidebarOpen);
        } else {
            const nextCollapsed = !isSidebarCollapsed;
            setSidebarCollapsed(nextCollapsed);
            localStorage.setItem('sidebar_collapsed', String(nextCollapsed));
        }
    };

    return (
        <div className={layoutStyles.layoutContainer}>
            {/* Top Global Navbar */}
            <Navbar 
                onToggleSidebar={toggleSidebar} 
                isSidebarCollapsed={isSidebarCollapsed} 
                onOpenSearch={() => setIsSearchOpen(true)}
            />

            {/* Global Search Modal */}
            <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            <div className={layoutStyles.bodyContainer}>
                {/* Mobile Drawer Overlay */}
                {isSidebarOpen && (
                    <div
                        className={`${layoutStyles.overlay} ${layoutStyles.show}`}
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar Navigation */}
                <Sidebar
                    isOpen={isSidebarOpen}
                    isCollapsed={isSidebarCollapsed}
                    onClose={() => setSidebarOpen(false)}
                />

                {/* Main Content Pane */}
                <main 
                    className={`${layoutStyles.mainContent} ${
                        isSidebarCollapsed ? layoutStyles.collapsedContent : ''
                    }`}
                >
                    <div className={layoutStyles.contentContainer}>
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}