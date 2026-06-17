import { useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import type { Doctor } from '../../types';
import { FirstAid, MagnifyingGlass, User, Globe, MapPin, Star } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookAppointmentModal from '@/features/doctor/BookAppointmentModal';
import styles from './DoctorList.module.css';

interface InternetDoctor {
    title: string;
    address?: string;
    rating?: number;
    userRatingsTotal?: number;
    link?: string;
}

export default function DoctorList() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const { state } = useLocation();
    const initialSpec = searchParams.get('specialty') || 'All';
    const internetDoctors: InternetDoctor[] = state?.internetDoctors || [];

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSpec, setSelectedSpec] = useState(initialSpec);
    const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
    const [activeTab, setActiveTab] = useState<'app' | 'google'>('app');

    const predefinedSpecialties = ['All', 'Cardiology', 'General Medicine', 'Neurology', 'Pediatrics', 'Dermatology'];
    const displaySpecialties = predefinedSpecialties.includes(selectedSpec) || selectedSpec === 'All'
        ? predefinedSpecialties
        : [...predefinedSpecialties, selectedSpec];

    const fetchDoctors = async () => {
        setLoading(true);
        let query = supabase.from('User').select('*').eq('role', 'DOCTOR');

        if (selectedSpec !== 'All') {
            query = query.ilike('specialty', `%${selectedSpec}%`);
        }

        const { data, error } = await query;
        if (!error && data) setDoctors(data as Doctor[]);
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fetchDoctors();
    }, [selectedSpec]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const getSpecialtyKey = (spec: string) => {
        return spec.toLowerCase().replace(/ /g, '_');
    };

    return (
        <motion.div
            className={styles.container}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className={styles.header}>
                <motion.h1 className={styles.title} variants={itemVariants}>{t('doctor_list.title')}</motion.h1>
                <motion.p className={styles.subtitle} variants={itemVariants}>{t('doctor_list.subtitle')}</motion.p>
            </div>

            {/* Animated Tabs */}
            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    <button
                        onClick={() => setActiveTab('app')}
                        className={`${styles.tabBtn} ${activeTab === 'app' ? styles.active : ''}`}
                    >
                        {activeTab === 'app' && (
                            <motion.div
                                layoutId="doctorListPill"
                                className={styles.activePill}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className={styles.tabContent}>
                            <User size={18} weight={activeTab === 'app' ? 'fill' : 'regular'} />
                            {t('doctor_list.tabs.app_doctors')}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('google')}
                        className={`${styles.tabBtn} ${activeTab === 'google' ? styles.active : ''}`}
                    >
                        {activeTab === 'google' && (
                            <motion.div
                                layoutId="doctorListPill"
                                className={styles.activePill}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className={styles.tabContent}>
                            <Globe size={18} weight={activeTab === 'google' ? 'fill' : 'regular'} />
                            {t('doctor_list.tabs.google_doctors')}
                        </span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                {activeTab === 'app' ? (
                    <motion.div
                        key="app"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className={styles.filters}>
                            {displaySpecialties.map(spec => (
                                <button
                                    key={spec}
                                    onClick={() => setSelectedSpec(spec)}
                                    className={`${styles.filterChip} ${selectedSpec === spec ? styles.filterChipActive : ''}`}
                                >
                                    {t(`doctor_list.specialties.${getSpecialtyKey(spec)}`, spec)}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className={styles.emptyState}>{t('doctor_list.loading')}</div>
                        ) : doctors.length === 0 ? (
                            <div className={styles.emptyState}>
                                <MagnifyingGlass size={48} />
                                <p>{t('doctor_list.no_results', { spec: t(`doctor_list.specialties.${getSpecialtyKey(selectedSpec)}`, selectedSpec) })}</p>
                            </div>
                        ) : (
                            <motion.div className={styles.grid} variants={containerVariants} initial="hidden" animate="visible">
                                {doctors.map(doc => (
                                    <motion.div key={doc.id} className={styles.card} variants={itemVariants} whileHover={{ y: -8 }}>
                                        <div className={styles.avatar}>
                                            <User size={40} />
                                        </div>
                                        <h3 className={styles.docName}>{doc.full_name}</h3>
                                        <span className={styles.specialty}>
                                            {doc.specialty ? t(`doctor_list.specialties.${getSpecialtyKey(doc.specialty)}`, doc.specialty) : t('doctor_list.general_physician')}
                                        </span>
                                        <button
                                            onClick={() => setBookingDoctor(doc)}
                                            className={styles.bookBtn}
                                        >
                                            <FirstAid size={20} /> {t('doctor_list.book_btn')}
                                        </button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="google"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {internetDoctors.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Globe size={48} />
                                <p>{t('doctor_list.no_internet')}</p>
                            </div>
                        ) : (
                            <div className={styles.googleList}>
                                {internetDoctors.map((doc, idx) => (
                                    <motion.div
                                        key={idx}
                                        className={styles.googleCard}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <div className={styles.googleInfo}>
                                            <div className={styles.googleIcon}>
                                                <Globe size={24} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{doc.title}</h3>
                                                <div className={styles.googleMeta}>
                                                    {doc.address && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <MapPin size={16} /> {doc.address}
                                                        </span>
                                                    )}
                                                    {doc.rating && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontWeight: 'bold' }}>
                                                            <Star size={16} weight="fill" /> {doc.rating} ({doc.userRatingsTotal || 0})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <a
                                            href={doc.link || `https://www.google.com/search?q=${encodeURIComponent(doc.title + ' ' + (doc.address || ''))}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className={styles.mapBtn}
                                        >
                                            <MapPin size={20} /> {t('doctor_list.view_map')}
                                        </a>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Booking Modal */}
            {bookingDoctor && (
                <BookAppointmentModal
                    doctor={bookingDoctor}
                    onClose={() => setBookingDoctor(null)}
                />
            )}
        </motion.div>
    );
}