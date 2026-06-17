import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Phone, Envelope, SignOut, User, Drop, CalendarCheck, CaretRight,
    PencilSimple, Heartbeat, GraduationCap, Wallet
} from 'phosphor-react';
import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
    full_name: string;
    email: string;
    phone: string;
    role: string;
    blood_group?: string;
    district?: string;
    specialty?: string;
    degree?: string;
    consultation_fee?: number;
    about?: string;
}

export default function ProfilePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('User').select('*').eq('id', user.id).single();
            if (data) {
                setProfile({
                    full_name: data.full_name || 'User',
                    email: user.email || '',
                    phone: data.phone || 'N/A',
                    role: data.role || 'CITIZEN',
                    blood_group: data.blood_group,
                    district: data.district,
                    specialty: data.specialty,
                    degree: data.degree,
                    consultation_fee: data.consultation_fee,
                    about: data.about
                });
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        if (window.confirm(t('common.confirm_logout'))) {
            await supabase.auth.signOut();
            navigate('/login');
        }
    };

    if (loading) return <div className={styles.loading}>{t('profile.loading')}</div>;

    return (
        <motion.div
            className={styles.container}
            initial="hidden"
            animate="visible"
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                }
            }}
        >
            <motion.div
                className={styles.pageHeader}
                variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
            >
                <h2 className={styles.pageTitle}>{t('profile.title')}</h2>
                <button
                    onClick={() => navigate('/profile/edit')}
                    className={styles.editBtn}
                >
                    <PencilSimple size={18} weight="bold" /> {t('common.edit')}
                </button>
            </motion.div>

            {/* Profile Card */}
            <motion.div
                className={styles.profileCard}
                variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
            >
                <div className={styles.avatarCircle}>
                    {profile?.full_name?.[0]?.toUpperCase() || <User />}
                </div>

                <h1 className={styles.userName}>{profile?.full_name}</h1>
                <div className={styles.userEmail}>{profile?.email}</div>

                <span className={styles.roleBadge}>
                    {profile?.role}
                </span>

                <div className={styles.badgeContainer}>
                    {profile?.blood_group && (
                        <Badge icon={<Drop weight="fill" />} text={profile.blood_group} color="#DC2626" bg="#FEF2F2" />
                    )}
                    {profile?.role === 'DOCTOR' && profile.specialty && (
                        <Badge icon={<Heartbeat weight="fill" />} text={profile.specialty} color="#059669" bg="#D1FAE5" />
                    )}
                </div>
            </motion.div>

            {/* Doctor Specific Details */}
            {profile?.role === 'DOCTOR' && (
                <motion.div
                    className={styles.sectionWrapper}
                    variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
                >
                    <h3 className={styles.sectionTitle}>{t('profile.professional')}</h3>
                    <div className={styles.infoStack}>
                        {profile.degree && <InfoRow icon={<GraduationCap weight="duotone" size={24} />} label={t('profile.fields.degree')} value={profile.degree} />}
                        {profile.consultation_fee && <InfoRow icon={<Wallet weight="duotone" size={24} />} label={t('profile.fields.fees')} value={`৳${profile.consultation_fee}`} />}
                        {profile.about && <div className={styles.aboutBox}>"{profile.about}"</div>}
                    </div>
                </motion.div>
            )}

            {/* General Info */}
            <motion.div
                className={styles.sectionWrapper}
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
            >
                <h3 className={styles.sectionTitle}>{t('profile.contact_info')}</h3>
                <div className={styles.infoStack}>
                    <InfoRow icon={<Phone weight="duotone" size={24} />} label={t('profile.fields.phone')} value={profile?.phone || 'N/A'} />
                    <InfoRow icon={<Envelope weight="duotone" size={24} />} label={t('profile.fields.email')} value={profile?.email || ''} />
                </div>
            </motion.div>

            {/* Activity Links */}
            <motion.div
                className={styles.sectionWrapper}
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
            >
                <h3 className={styles.sectionTitle}>{t('profile.activity')}</h3>
                <div className={styles.infoStack}>
                    {/* Removed My Appointments link as it is now in Sidebar */}
                    <NavButton onClick={() => navigate('/blood/my-requests')} icon={<Drop size={20} weight="fill" />} label={t('profile.my_blood_requests')} color="#EF4444" bg="#FEF2F2" />
                    <NavButton onClick={() => navigate('/blood/register')} icon={<User size={20} weight="fill" />} label={t('profile.donor_settings')} color="#10B981" bg="#F0FDF4" />
                </div>
            </motion.div>

            <motion.button
                onClick={handleLogout}
                className={styles.logoutBtn}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <SignOut size={20} weight="bold" /> {t('common.logout')}
            </motion.button>
        </motion.div>
    );
}

// Helper Components
interface BadgeProps {
    icon: React.ReactNode;
    text: string;
    color: string;
    bg: string;
}
const Badge = ({ icon, text, color, bg }: BadgeProps) => (
    <div className={styles.customBadge} style={{ backgroundColor: bg, color: color }}>
        {icon} {text}
    </div>
);

interface InfoRowProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
}
const InfoRow = ({ icon, label, value }: InfoRowProps) => (
    <div className={styles.infoRow}>
        <div style={{ color: 'var(--text-secondary)' }}>{icon}</div>
        <div>
            <small className={styles.infoLabel}>{label}</small>
            <div className={styles.infoValue}>{value}</div>
        </div>
    </div>
);

interface NavButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    color: string;
    bg: string;
}
const NavButton = ({ onClick, icon, label, color, bg }: NavButtonProps) => (
    <button onClick={onClick} className={styles.navButton}>
        <div className={styles.navContent}>
            <div className={styles.navIconBox} style={{ backgroundColor: bg, color: color }}>{icon}</div>
            <span className={styles.navLabel}>{label}</span>
        </div>
        <CaretRight size={18} color="#94A3B8" />
    </button>
);