import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Calendar, Clock, MapPin, CheckCircle, XCircle, Hourglass,
    Prescription as PrescriptionIcon, TestTube, Buildings, FileText, CalendarBlank
} from 'phosphor-react';
import { format } from 'date-fns';
import styles from './PatientAppointments.module.css';

// Types
interface Appointment {
    id: string;
    created_at: string;
    appointment_date: string;
    status: string;
    reason: string;
    doctor: { full_name: string; specialty: string };
    hospital?: { full_name: string; address: string };
}



interface Diagnostic {
    id: string;
    created_at: string;
    report_status: string;
    provider: { full_name: string };
}

export default function PatientAppointments() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    const getSpecialtyKey = (spec: string) => {
        return spec ? spec.toLowerCase().replace(/ /g, '_') : '';
    };

    const getStatusTranslationKey = (status: string) => {
        const s = status.toUpperCase();
        if (s === 'ACCEPTED') return 'CONFIRMED';
        return s;
    };
    const initialTab = (searchParams.get('tab') as 'appointments' | 'diagnostic' | 'hospitals') || 'appointments';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Sync state with URL when tab is clicked
    const handleTabChange = (id: string) => {
        setActiveTab(id as any);
        setSearchParams({ tab: id });
    };

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl as any);
        }
    }, [searchParams]);
    const [loading, setLoading] = useState(true);

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);

    // Rescheduling states
    const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduling, setRescheduling] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (activeTab === 'appointments') {
            const { data } = await supabase
                .from('Appointment')
                .select('*, doctor:doctor_id(full_name, specialty), hospital:hospital_id(full_name, address)')
                .eq('patient_id', user.id)
                .order('appointment_date', { ascending: false });
            if (data) setAppointments(data as unknown as Appointment[]);
        }
        else if (activeTab === 'diagnostic') {
            const { data } = await supabase
                .from('patient_payments')
                .select('*, provider:provider_id(full_name)')
                .eq('patient_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setDiagnostics(data as unknown as Diagnostic[]);
        }

        setLoading(false);
    }, [activeTab]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    const handleCancelAppointment = async (id: string) => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;
        try {
            const { error } = await supabase
                .from('Appointment')
                .update({ status: 'CANCELLED' })
                .eq('id', id);

            if (error) throw error;
            alert("Appointment cancelled successfully.");
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to cancel appointment: " + err.message);
        }
    };

    const handleOpenReschedule = (app: Appointment) => {
        setRescheduleAppointment(app);
        setRescheduleDate(app.appointment_date ? new Date(app.appointment_date).toISOString().slice(0, 16) : '');
    };

    const handleSaveReschedule = async () => {
        if (!rescheduleAppointment || !rescheduleDate) return;
        setRescheduling(true);
        try {
            const { error } = await supabase
                .from('Appointment')
                .update({ appointment_date: rescheduleDate })
                .eq('id', rescheduleAppointment.id);

            if (error) throw error;
            alert("Appointment rescheduled successfully.");
            setRescheduleAppointment(null);
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert("Failed to reschedule appointment: " + err.message);
        } finally {
            setRescheduling(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'CONFIRMED':
            case 'Accepted':
                return { className: styles.statusConfirmed, icon: <CheckCircle weight="fill" /> };
            case 'CANCELLED': return { className: styles.statusCancelled, icon: <XCircle weight="fill" /> };
            default: return { className: styles.statusPending, icon: <Hourglass weight="fill" /> };
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{t('appointments.title')}</h2>

            {/* Tabs */}
            {/* Tabs */}
            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    {[
                        { id: 'appointments', label: t('appointments.tabs.appointments'), icon: <Calendar size={20} /> },
                        { id: 'diagnostic', label: t('appointments.tabs.diagnostic'), icon: <TestTube size={20} /> },
                        // { id: 'hospitals', label: t('appointments.tabs.hospitals'), icon: <Buildings size={20} /> }, // Hidden for now as it was empty
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activePill"
                                    className={styles.activePill}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className={styles.tabContent}>
                                {tab.icon} {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>{t('appointments.loading')}</div>
            ) : (
                <>
                    {/* Appointments Tab */}
                    {activeTab === 'appointments' && (
                        <motion.div
                            className={styles.gridList}
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
                            {appointments.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Calendar className={styles.emptyIcon} size={48} />
                                    <p>{t('appointments.no_appointments')}</p>
                                </div>
                            ) : (
                                appointments.map(app => {
                                    const { className } = getStatusInfo(app.status);
                                    const dateObj = new Date(app.appointment_date);
                                    return (
                                        <motion.div
                                            key={app.id}
                                            className={styles.card}
                                            variants={{
                                                hidden: { opacity: 0, y: 20 },
                                                visible: { opacity: 1, y: 0 }
                                            }}
                                        >
                                            <div className={styles.cardContent}>
                                                <div className={styles.dateBlock}>
                                                    <span className={styles.dateMonth}>{format(dateObj, 'MMM')}</span>
                                                    <span className={styles.dateDay}>{format(dateObj, 'dd')}</span>
                                                </div>

                                                <div className={styles.infoSection}>
                                                    <div className={styles.mainTitle}>{app.doctor.full_name}</div>
                                                    <div className={styles.subTitle}>
                                                        {app.doctor.specialty ? t(`doctor_list.specialties.${getSpecialtyKey(app.doctor.specialty)}`, app.doctor.specialty) : t('doctor_list.general_physician')}
                                                    </div>

                                                    <div className={styles.metaInfo}>
                                                        {app.hospital && (
                                                            <div className={styles.metaItem}>
                                                                <MapPin size={16} weight="fill" />
                                                                {app.hospital.full_name}
                                                            </div>
                                                        )}
                                                        <div className={styles.metaItem}>
                                                            <Clock size={16} weight="fill" />
                                                            {format(dateObj, 'h:mm a')}
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`${styles.statusBadge} ${className}`}>
                                                    {t(`status.${getStatusTranslationKey(app.status)}`, app.status)}
                                                </span>
                                            </div>

                                            {app.status !== 'CANCELLED' && (
                                                <div className={styles.cardActions}>
                                                    <button 
                                                        className={styles.rescheduleBtn}
                                                        onClick={() => handleOpenReschedule(app)}
                                                    >
                                                        Reschedule
                                                    </button>
                                                    <button 
                                                        className={styles.cancelBtn}
                                                        onClick={() => handleCancelAppointment(app.id)}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            )}
                        </motion.div>
                    )}



                    {/* Diagnostic Tab */}
                    {activeTab === 'diagnostic' && (
                        <motion.div
                            className={styles.gridList}
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
                            {diagnostics.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <TestTube className={styles.emptyIcon} size={48} />
                                    <p>{t('appointments.no_diagnostics')}</p>
                                </div>
                            ) : (
                                diagnostics.map(test => (
                                    <motion.div
                                        key={test.id}
                                        className={styles.card}
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                    >
                                        <div className={`${styles.cardContent} ${styles.cardContentCenter}`}>
                                            <div className={`${styles.iconWrapper} ${styles.diagnosticIcon}`}>
                                                <TestTube size={28} weight="duotone" />
                                            </div>
                                            <div className={styles.infoSection}>
                                                <div className={styles.mainTitle}>{test.provider.full_name}</div>
                                                <div className={styles.subTitle}>
                                                    {t('appointments.diagnostic_report')}
                                                </div>
                                                <div className={styles.metaInfo}>
                                                    <div className={styles.metaItem}>
                                                        <CalendarBlank size={16} weight="fill" />
                                                        {format(new Date(test.created_at), 'MMM dd, yyyy')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <span className={`${styles.statusText} ${test.report_status === 'COMPLETED' ? styles.statusCompleted : styles.statusPendingText}`}>
                                                    {test.report_status}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}

                    {/* Hospitals Tab */}
                    {activeTab === 'hospitals' && <EmptyState text={t('appointments.no_hospitals')} />}
                </>
            )}

            {/* Reschedule Modal */}
            {rescheduleAppointment && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>Reschedule Appointment</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.25rem' }}>
                            With Dr. {rescheduleAppointment.doctor.full_name}
                        </p>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Choose New Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={rescheduleDate}
                                onChange={e => setRescheduleDate(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button 
                                onClick={() => setRescheduleAppointment(null)}
                                className={styles.cancelModalBtn}
                                disabled={rescheduling}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveReschedule}
                                className={styles.saveBtn}
                                disabled={rescheduling || !rescheduleDate}
                            >
                                {rescheduling ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Components
function EmptyState({ text }: { text: string }) {
    return (
        <div className={styles.emptyState}>
            <Hourglass size={48} className={styles.emptyIcon} />
            <p>{text}</p>
        </div>
    );
}