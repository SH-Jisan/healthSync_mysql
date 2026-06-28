import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Phone, Envelope, SignOut, User, Drop, CaretRight,
    PencilSimple, Heartbeat, GraduationCap, Wallet, IdentificationCard, ShieldCheck,
    CheckCircle, FirstAid, FileText
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

    if (loading) {
        return (
            <div className={styles.loading}>
                <span>{t('profile.loading') || 'Loading Profile...'}</span>
            </div>
        );
    }

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
        >
            {/* Top Header Bar */}
            <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>Digital Health Profile</h2>
                <button onClick={() => navigate('/profile/edit')} className={styles.editBtn}>
                    <PencilSimple size={18} weight="bold" /> Edit Profile Details
                </button>
            </div>

            {/* Hero Profile Banner & User Identity Card */}
            <div className={styles.profileHeroCard}>
                <div className={styles.heroBanner}></div>
                <div className={styles.profileHeroBody}>
                    <div className={styles.avatarHeaderRow}>
                        <div className={styles.avatarCircle}>
                            {profile?.full_name?.[0]?.toUpperCase() || <User />}
                        </div>
                        <span className={styles.roleBadge}>
                            <ShieldCheck size={16} weight="fill" />
                            {profile?.role}
                        </span>
                    </div>

                    <div className={styles.userIdentity}>
                        <h1 className={styles.userName}>
                            {profile?.full_name}
                            <CheckCircle size={20} weight="fill" color="var(--primary)" />
                        </h1>
                        <span className={styles.userEmail}>{profile?.email}</span>
                    </div>

                    {/* Quick Health Stats Chips */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                                <Drop weight="fill" />
                            </div>
                            <div>
                                <span className={styles.statLabel}>Blood Group</span>
                                <span className={styles.statValue}>{profile?.blood_group || 'Not set'}</span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                                <IdentificationCard weight="fill" />
                            </div>
                            <div>
                                <span className={styles.statLabel}>Health ID</span>
                                <span className={styles.statValue}>{profile?.health_id || 'HS-PENDING'}</span>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                <FirstAid weight="fill" />
                            </div>
                            <div>
                                <span className={styles.statLabel}>Allergies</span>
                                <span className={styles.statValue}>{profile?.allergies ? 'Recorded' : 'None'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid (Left Contact/Bio vs Right Health ID & Clinical) */}
            <div className={styles.mainGrid}>
                {/* Left Side: Contact & Account Information */}
                <div className={styles.sideColumn}>
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeaderRow}>
                            <h3 className={styles.sectionTitle}>
                                <User size={20} color="var(--primary)" /> Contact Information
                            </h3>
                        </div>
                        <div className={styles.infoStack}>
                            <div className={styles.infoRow}>
                                <Phone size={20} className={styles.infoIcon} />
                                <div>
                                    <span className={styles.infoLabel}>{t('profile.fields.phone')}</span>
                                    <span className={styles.infoValue}>{profile?.phone || 'N/A'}</span>
                                </div>
                            </div>

                            <div className={styles.infoRow}>
                                <Envelope size={20} className={styles.infoIcon} />
                                <div>
                                    <span className={styles.infoLabel}>{t('profile.fields.email')}</span>
                                    <span className={styles.infoValue}>{profile?.email || 'N/A'}</span>
                                </div>
                            </div>

                            {profile?.district && (
                                <div className={styles.infoRow}>
                                    <IdentificationCard size={20} className={styles.infoIcon} />
                                    <div>
                                        <span className={styles.infoLabel}>District & Address</span>
                                        <span className={styles.infoValue}>{profile.address ? `${profile.address}, ` : ''}{profile.district}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Navigations */}
                    <div className={styles.sectionCard}>
                        <div className={styles.sectionHeaderRow}>
                            <h3 className={styles.sectionTitle}>
                                <FileText size={20} color="var(--primary)" /> Health Activities
                            </h3>
                        </div>
                        <div className={styles.infoStack}>
                            <button onClick={() => navigate('/blood/my-requests')} className={styles.navButton}>
                                <div className={styles.navContent}>
                                    <div className={styles.navIconBox} style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>
                                        <Drop weight="fill" />
                                    </div>
                                    <span className={styles.navLabel}>{t('profile.my_blood_requests')}</span>
                                </div>
                                <CaretRight size={18} color="var(--text-muted)" />
                            </button>

                            <button onClick={() => navigate('/blood/register')} className={styles.navButton}>
                                <div className={styles.navContent}>
                                    <div className={styles.navIconBox} style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
                                        <User weight="fill" />
                                    </div>
                                    <span className={styles.navLabel}>{t('profile.donor_settings')}</span>
                                </div>
                                <CaretRight size={18} color="var(--text-muted)" />
                            </button>
                        </div>
                    </div>

                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <SignOut size={20} weight="bold" /> {t('common.logout')}
                    </button>
                </div>

                {/* Right Side: Role Specific Modules */}
                <div className={styles.contentColumn}>
                    {profile?.role === 'CITIZEN' && (
                        <>
                            {/* Theme-Adaptive Digital Health ID Card */}
                            <div className={styles.healthIdCard}>
                                <div className={styles.idCardHeader}>
                                    <div>
                                        <h3 className={styles.idCardBrand}>HEALTHSYNC</h3>
                                        <span className={styles.idCardSubtitle}>Government Digital Health Record</span>
                                    </div>
                                    <span className={styles.idCardNumber}>
                                        {profile.health_id || 'HS-PENDING'}
                                    </span>
                                </div>

                                <div className={styles.idGrid}>
                                    <div>
                                        <span className={styles.infoLabel}>Citizen Name</span>
                                        <span className={styles.infoValue}>{profile.full_name}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>Blood Group</span>
                                        <span className={styles.infoValue} style={{ color: 'var(--error)' }}>{profile.blood_group || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>National ID (NID)</span>
                                        <span className={styles.infoValue}>{profile.national_id || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>Passport Number</span>
                                        <span className={styles.infoValue}>{profile.passport_number || 'N/A'}</span>
                                    </div>
                                </div>

                                {profile.emergency_contact_name && (
                                    <div className={styles.emergencyBanner}>
                                        <span className={styles.emergencyTitle}>Emergency Contact</span>
                                        <span className={styles.emergencyText}>
                                            {profile.emergency_contact_name} ({profile.emergency_contact_phone})
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Clinical Health Records */}
                            <div className={styles.sectionCard}>
                                <div className={styles.sectionHeaderRow}>
                                    <h3 className={styles.sectionTitle}>
                                        <Heartbeat size={20} color="var(--primary)" /> Clinical Medical Profile
                                    </h3>
                                </div>

                                <div className={styles.idGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    <div>
                                        <span className={styles.infoLabel}>Known Allergies</span>
                                        <span className={styles.infoValue}>{profile.allergies || 'No allergies recorded.'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>Chronic Illnesses</span>
                                        <span className={styles.infoValue}>{profile.chronic_diseases || 'No chronic diseases recorded.'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>Vaccination History</span>
                                        <span className={styles.infoValue}>{profile.vaccination_history || 'No vaccines recorded.'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>Insurance Policy</span>
                                        <span className={styles.infoValue}>{profile.insurance_info || 'No active policy recorded.'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>Organ Donor Status</span>
                                        <span className={styles.infoValue} style={{ color: 'var(--primary)', fontWeight: 700 }}>{profile.organ_donor_status || 'NONE'}</span>
                                    </div>
                                    <div>
                                        <span className={styles.infoLabel}>Birth Registration No.</span>
                                        <span className={styles.infoValue}>{profile.birth_reg_number || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {profile?.role === 'DOCTOR' && (
                        <>
                            {/* License Verification Card */}
                            <div className={styles.sectionCard}>
                                <div className={styles.sectionHeaderRow}>
                                    <h3 className={styles.sectionTitle}>
                                        <ShieldCheck size={20} color="var(--primary)" /> Clinical License Verification
                                    </h3>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ background: profile.license_status === 'VERIFIED' ? 'var(--success)' : 'var(--warning)', padding: '12px', borderRadius: '12px', color: '#fff' }}>
                                        <ShieldCheck size={32} weight="fill" />
                                    </div>
                                    <div>
                                        <span className={styles.infoValue} style={{ fontSize: '16px', fontWeight: 700 }}>License No: {profile.license_number || 'PENDING'}</span>
                                        <span className={styles.infoLabel} style={{ marginTop: '4px' }}>
                                            Status: <strong style={{ color: profile.license_status === 'VERIFIED' ? 'var(--success)' : 'var(--warning)' }}>{profile.license_status || 'PENDING'}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Doctor Credentials */}
                            <div className={styles.sectionCard}>
                                <div className={styles.sectionHeaderRow}>
                                    <h3 className={styles.sectionTitle}>
                                        <GraduationCap size={20} color="var(--primary)" /> Professional Details
                                    </h3>
                                </div>
                                <div className={styles.infoStack}>
                                    {profile.degree && (
                                        <div className={styles.infoRow}>
                                            <GraduationCap size={20} className={styles.infoIcon} />
                                            <div>
                                                <span className={styles.infoLabel}>{t('profile.fields.degree')}</span>
                                                <span className={styles.infoValue}>{profile.degree}</span>
                                            </div>
                                        </div>
                                    )}
                                    {profile.consultation_fee && (
                                        <div className={styles.infoRow}>
                                            <Wallet size={20} className={styles.infoIcon} />
                                            <div>
                                                <span className={styles.infoLabel}>{t('profile.fields.fees')}</span>
                                                <span className={styles.infoValue}>৳{profile.consultation_fee}</span>
                                            </div>
                                        </div>
                                    )}
                                    {profile.about && (
                                        <div>
                                            <span className={styles.infoLabel}>About Doctor</span>
                                            <p className={styles.infoValue} style={{ fontStyle: 'italic', marginTop: '4px' }}>"{profile.about}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}