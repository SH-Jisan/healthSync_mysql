/* eslint-disable */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Drop,
    Info,
    User,
    SignOut,
    FirstAid,
    SquaresFour,
    Prescription,
    CalendarCheck
} from 'phosphor-react';
import { motion } from 'framer-motion';
import styles from './Sidebar.module.css';

interface SidebarProps {
    onClose?: () => void;
    isOpen?: boolean;
    isCollapsed?: boolean;
}

export default function Sidebar({ onClose, isOpen = false, isCollapsed = false }: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const menuItems = [
        { key: 'dashboard', icon: <SquaresFour size={22} />, path: '/dashboard' },
        ...((user?.user_metadata?.role === 'CITIZEN') ? [
            { key: 'appointments', icon: <CalendarCheck size={22} />, path: '/appointments' },
        ] : []),
        ...((user?.user_metadata?.role === 'DOCTOR') ? [
            { key: 'citizen_view', icon: <User size={22} />, path: '/doctor/citizen-view' },
        ] : []),
        ...((user?.user_metadata?.role === 'CITIZEN' || user?.user_metadata?.role === 'DOCTOR') ? [{
            key: 'prescriptions',
            icon: <Prescription size={22} />,
            path: '/prescriptions'
        }] : []),
        { key: 'blood', icon: <Drop size={22} color="#EF4444" />, path: '/blood' },
        { key: 'doctors', icon: <FirstAid size={22} color="#0d9488" />, path: '/doctors' },
        { key: 'profile', icon: <User size={22} />, path: '/profile' },
        { key: 'about', icon: <Info size={22} color="#0284c7" />, path: '/about' },
    ];

    return (
        <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''} ${isCollapsed ? styles.collapsed : ''}`}>
            {/* Header / User Card */}
            <div className={styles.header}>
                <span className={styles.welcomeLabel}>
                    {t('common.welcome')}
                </span>
                <div 
                    className={styles.userCard}
                    onClick={() => navigate('/profile')}
                >
                    <div className={styles.avatar}>
                        {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className={styles.userInfo}>
                        <h3>{user?.user_metadata?.full_name || 'User'}</h3>
                        <p>{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    const isActive = item.path === '/dashboard'
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);

                    return (
                        <div
                            key={item.key}
                            className={`${styles.navItem} ${isActive ? styles.activeItem : ''}`}
                            onClick={() => {
                                navigate(item.path);
                                if (onClose) onClose();
                            }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className={styles.activePill}
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                            )}
                            <span className={styles.navContent}>
                                <span 
                                    className={styles.navIcon}
                                    data-tooltip={isCollapsed ? t(`menu.${item.key}`) : undefined}
                                >
                                    {item.icon}
                                </span>
                                <span className={styles.navLabel}>
                                    {t(`menu.${item.key}`)}
                                </span>
                            </span>
                        </div>
                    );
                })}
            </nav>

            {/* Logout Footer */}
            <div className={styles.footer}>
                <div 
                    className={`${styles.navItem} ${styles.logout}`} 
                    onClick={handleLogout}
                >
                    <span className={styles.navContent}>
                        <span 
                            className={styles.navIcon}
                            data-tooltip={isCollapsed ? t('common.logout') : undefined}
                        >
                            <SignOut size={22} />
                        </span>
                        <span className={styles.navLabel}>
                            {t('common.logout')}
                        </span>
                    </span>
                </div>
            </div>
        </aside>
    );
}