import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Phone, Envelope, SignOut, User, Drop, CalendarCheck, CaretRight,
    PencilSimple, Heartbeat, GraduationCap, Wallet, IdentificationCard, ShieldCheck, Info, Warning
} from 'phosphor-react';
import styles from './Profile.module.css';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
    health_id?: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
    blood_group?: string;
    district?: string;
    address?: string;
    // Citizen specific
    national_id?: string;
    birth_reg_number?: string;
    passport_number?: string;
    allergies?: string;
    chronic_diseases?: string;
    vaccination_history?: string;
    insurance_info?: string;
    organ_donor_status?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    // Doctor specific
    specialty?: string;
    degree?: string;
    consultation_fee?: number;
    about?: string;
    license_number?: string;
    license_status?: string;
}

export default function ProfilePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('User').select('*').eq('id', user.id).single();
            if (data) {
                setProfile({
                    health_id: data.health_id,
                    full_name: data.full_name || 'User',
                    email: user.email || '',
                    phone: data.phone || 'N/A',
                    role: data.role || 'CITIZEN',
                    blood_group: data.blood_group,
                    district: data.district,
                    address: data.address,
                    national_id: data.national_id,
                    birth_reg_number: data.birth_reg_number,
                    passport_number: data.passport_number,
                    allergies: data.allergies,
                    chronic_diseases: data.chronic_diseases,
                    vaccination_history: data.vaccination_history,
                    insurance_info: data.insurance_info,
                    organ_donor_status: data.organ_donor_status,
                    emergency_contact_name: data.emergency_contact_name,
                    emergency_contact_phone: data.emergency_contact_phone,
                    specialty: data.specialty,
                    degree: data.degree,
                    consultation_fee: data.consultation_fee,
                    about: data.about,
                    license_number: data.license_number,
                    license_status: data.license_status
                });
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

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
                <h2 className={styles.pageTitle}>Digital Health Profile</h2>
                <button
                    onClick={() => navigate('/profile/edit')}
                    className={styles.editBtn}
                >
                    <PencilSimple size={18} weight="bold" /> Edit Profile Details
                </button>
            </motion.div>

            {/* Profile Grid (Layout: Profile Card & Health ID / Doctor Info Side-by-Side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', width: '100%' }}>
                
                {/* Left Side: General Profile Card */}
                <div>
                    <motion.div
                        className={styles.profileCard}
                        variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                        style={{ height: '100%' }}
                    >
                        <div className={styles.avatarCircle}>
                            {profile?.full_name?.[0]?.toUpperCase() || <User />}
                        </div>

                        <h1 className={styles.userName}>{profile?.full_name}</h1>
                        <div className={styles.userEmail}>{profile?.email}</div>

                        <span className={styles.roleBadge} style={{ textTransform: 'uppercase' }}>
                            {profile?.role}
                        </span>

                        <div className={styles.badgeContainer} style={{ marginTop: '12px' }}>
                            {profile?.blood_group && (
                                <Badge icon={<Drop weight="fill" />} text={`Group ${profile.blood_group}`} color="#ef4444" bg="#fef2f2" />
                            )}
                            {profile?.role === 'DOCTOR' && profile.specialty && (
                                <Badge icon={<Heartbeat weight="fill" />} text={profile.specialty} color="#6366f1" bg="#e0e7ff" />
                            )}
                        </div>

                        <div className={styles.infoStack} style={{ marginTop: '24px', textAlign: 'left', width: '100%' }}>
                            <InfoRow icon={<Phone weight="duotone" size={20} />} label={t('profile.fields.phone')} value={profile?.phone || 'N/A'} />
                            <InfoRow icon={<Envelope weight="duotone" size={20} />} label={t('profile.fields.email')} value={profile?.email || ''} />
                            {profile?.district && (
                                <InfoRow icon={<IdentificationCard weight="duotone" size={20} />} label="Location" value={`${profile.address || ''}, ${profile.district}`} />
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Workflows (Citizen Health ID Card OR Doctor Clinical Credentials) */}
                <div>
                    {profile?.role === 'CITIZEN' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Glassmorphic Digital Health ID Card */}
                            <motion.div
                                className="t-card"
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                style={{
                                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: '#3b82f6', filter: 'blur(80px)', borderRadius: '50%', opacity: 0.15 }}></div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', color: '#3b82f6', letterSpacing: '1px' }}>HEALTHSYNC</h3>
                                        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Government Digital Health ID</span>
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f1f5f9' }}>
                                        {profile.health_id || 'HS-PENDING'}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
                                    <div>
                                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Citizen Name</small>
                                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc' }}>{profile.full_name}</span>
                                    </div>
                                    <div>
                                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Blood Group</small>
                                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>{profile.blood_group || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>National ID (NID)</small>
                                        <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{profile.national_id || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <small style={{ display: 'block', fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Passport Number</small>
                                        <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{profile.passport_number || 'N/A'}</span>
                                    </div>
                                </div>

                                {profile.emergency_contact_name && (
                                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <small style={{ display: 'block', fontSize: '10px', color: '#f43f5e', textTransform: 'uppercase', fontWeight: 'bold' }}>Emergency Contact Contact</small>
                                        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                                            {profile.emergency_contact_name} ({profile.emergency_contact_phone})
                                        </span>
                                    </div>
                                )}
                            </motion.div>

                            {/* Medical Summary Details */}
                            <motion.div
                                className="t-card"
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                            >
                                <h3 className={styles.sectionTitle} style={{ borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '16px' }}>Clinical Health Profile</h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#f8fafc' }}>Allergies</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{profile.allergies || 'No allergies recorded.'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#f8fafc' }}>Chronic Illnesses</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{profile.chronic_diseases || 'No chronic diseases recorded.'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#f8fafc' }}>Vaccination History</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{profile.vaccination_history || 'No vaccines recorded.'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#f8fafc' }}>Insurance Policy</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{profile.insurance_info || 'No active health insurance policy.'}</p>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#f8fafc' }}>Organ Donor Status</h4>
                                        <span className="t-badge t-badge-info" style={{ display: 'inline-block' }}>
                                            {profile.organ_donor_status || 'NONE'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: '#f8fafc' }}>Birth Certificate</h4>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{profile.birth_reg_number || 'N/A'}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {profile?.role === 'DOCTOR' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Doctor License Verification Status */}
                            <motion.div
                                className="t-card"
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                            >
                                <h3 className={styles.sectionTitle} style={{ borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '16px' }}>Clinical License Verification</h3>
                                
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ background: profile.license_status === 'VERIFIED' ? '#059669' : '#d97706', padding: '12px', borderRadius: '8px', color: '#fff' }}>
                                        <ShieldCheck size={32} weight="fill" />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '16px', color: '#f1f5f9' }}>License Number: {profile.license_number || 'PENDING INITIALIZATION'}</h4>
                                        <span style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                            Status: 
                                            <strong className={`t-badge ${profile.license_status === 'VERIFIED' ? 't-badge-success' : 't-badge-warning'}`}>
                                                {profile.license_status || 'PENDING'}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Professional Details */}
                            <motion.div
                                className="t-card"
                                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                            >
                                <h3 className={styles.sectionTitle} style={{ borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '16px' }}>Professional Details</h3>
                                <div className={styles.infoStack}>
                                    {profile.degree && <InfoRow icon={<GraduationCap weight="duotone" size={24} />} label={t('profile.fields.degree')} value={profile.degree} />}
                                    {profile.consultation_fee && <InfoRow icon={<Wallet weight="duotone" size={24} />} label={t('profile.fields.fees')} value={`৳${profile.consultation_fee}`} />}
                                    {profile.about && <div className={styles.aboutBox}>"{profile.about}"</div>}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Actions & Links */}
            <motion.div
                className={styles.sectionWrapper}
                variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
                style={{ marginTop: '24px' }}
            >
                <h3 className={styles.sectionTitle}>{t('profile.activity')}</h3>
                <div className={styles.infoStack}>
                    <NavButton onClick={() => navigate('/blood/my-requests')} icon={<Drop size={20} weight="fill" />} label={t('profile.my_blood_requests')} color="var(--error)" bg="var(--error-light)" />
                    <NavButton onClick={() => navigate('/blood/register')} icon={<User size={20} weight="fill" />} label={t('profile.donor_settings')} color="var(--success)" bg="var(--success-light)" />
                </div>
            </motion.div>

            <motion.button
                onClick={handleLogout}
                className={styles.logoutBtn}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                style={{ marginTop: '24px' }}
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