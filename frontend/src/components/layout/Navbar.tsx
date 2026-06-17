import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    List,
    Bell,
    Sun,
    Moon,
    User,
    SignOut,
    Gear,
    Info,
    MagnifyingGlass
} from 'phosphor-react';
import styles from './Navbar.module.css';
import LanguageSwitcher from '../common/LanguageSwitcher';

interface NavbarProps {
    onToggleSidebar: () => void;
    isSidebarCollapsed: boolean;
    onOpenSearch: () => void;
}

export default function Navbar({ onToggleSidebar, isSidebarCollapsed, onOpenSearch }: NavbarProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const [user, setUser] = useState<any>(null);
    const [isDark, setIsDark] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch user info
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            if (data.user) {
                // Fetch unread notifications count
                supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', data.user.id)
                    .eq('is_read', false)
                    .then(({ data: notifications }) => {
                        if (notifications) setUnreadCount(notifications.length);
                    });
            }
        });

        // Initialize theme state from localStorage or current class
        const savedTheme = localStorage.getItem('healthsync_theme');
        const prefersDark = savedTheme === 'dark' || (!savedTheme && document.body.classList.contains('dark-theme'));
        if (prefersDark) {
            document.body.classList.add('dark-theme');
        }
        setIsDark(prefersDark);

        // Handle clicking outside the dropdown to close it
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        document.body.classList.toggle('dark-theme', next);
        localStorage.setItem('healthsync_theme', next ? 'dark' : 'light');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <header className={styles.navbar}>
            <div className={styles.leftSection}>
                {/* Hamburger Toggle */}
                <button 
                    onClick={onToggleSidebar} 
                    className={`${styles.iconButton} ${styles.hamburgerBtn} ${isSidebarCollapsed ? styles.collapsedHamburger : ''}`}
                    title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <List size={22} weight="bold" />
                </button>
                
                {/* Brand Logo */}
                <Link to="/dashboard" className={styles.logoLink}>
                    <img src="/logo3.png" alt="Logo" className={styles.logoImg} />
                    <span className={styles.logoText}>
                        Health<span className={styles.logoTextAccent}>Sync</span>
                    </span>
                </Link>
            </div>

            {/* Quick Search */}
            <div className={styles.searchBar} onClick={onOpenSearch} title="Search everything... (Ctrl+K)">
                <div className={styles.searchWrapper}>
                    <MagnifyingGlass size={18} className={styles.searchIcon} />
                    <span className={styles.searchPlaceholder}>
                        {t('common.search_placeholder', 'Search doctors, reports, appointments...')}
                    </span>
                </div>
                <span className={styles.searchShortcut}>Ctrl K</span>
            </div>

            <div className={styles.rightSection}>
                {/* Theme Toggle */}
                <button onClick={toggleTheme} className={styles.iconButton} title="Toggle Theme">
                    {isDark ? <Sun size={22} color="#f59e0b" weight="fill" /> : <Moon size={22} weight="bold" />}
                </button>

                {/* Language Switcher */}
                <div className={styles.langWrapper}>
                    <LanguageSwitcher variant="text" className={styles.langSwitcher} />
                </div>

                {/* Notifications Bell */}
                <button 
                    onClick={() => navigate('/notifications')} 
                    className={styles.notificationButton} 
                    title="Notifications"
                >
                    <Bell size={22} weight="bold" />
                    {unreadCount > 0 && (
                        <span className={styles.badge}>{unreadCount}</span>
                    )}
                </button>

                {/* Profile Dropdown */}
                <div className={styles.profileDropdown} ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                        className={styles.avatarButton}
                        title="User Menu"
                    >
                        <div className={styles.avatar}>
                            {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </button>

                    {isDropdownOpen && (
                        <div className={styles.dropdownMenu}>
                            <div className={styles.dropdownHeader}>
                                <h4>{user?.user_metadata?.full_name || 'User'}</h4>
                                <p>{user?.email}</p>
                                <span className={styles.roleBadge}>
                                    {user?.user_metadata?.role || 'CITIZEN'}
                                </span>
                            </div>
                            <div className={styles.dropdownDivider} />
                            
                            <Link 
                                to="/profile" 
                                className={styles.dropdownItem}
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <User size={18} />
                                <span>{t('menu.profile', 'Profile')}</span>
                            </Link>

                            <Link 
                                to="/profile/edit" 
                                className={styles.dropdownItem}
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <Gear size={18} />
                                <span>{t('profile.edit_profile', 'Edit Profile')}</span>
                            </Link>

                            <Link 
                                to="/about" 
                                className={styles.dropdownItem}
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <Info size={18} />
                                <span>{t('menu.about', 'About')}</span>
                            </Link>

                            <div className={styles.dropdownDivider} />
                            
                            <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutItem}`}>
                                <SignOut size={18} />
                                <span>{t('common.logout', 'Logout')}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
