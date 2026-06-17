import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import type { Appointment } from '../../types';
import { CheckCircle, XCircle, Clock, User, Calendar } from 'phosphor-react';
import { format } from 'date-fns';
import styles from './styles/DoctorAppointments.module.css';

interface AppointmentWithPatient extends Appointment {
    profiles?: {
        full_name: string;
        phone: string;
        blood_group?: string;
    } | null;
}

export default function DoctorAppointments() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAppointments = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('Appointment')
            .select('*, profiles:patient_id(full_name, phone, blood_group)')
            .eq('doctor_id', user.id)
            .order('appointment_date', { ascending: true });

        if (!error && data) {
            setAppointments(data as unknown as AppointmentWithPatient[]);
        }
        setLoading(false);
    };

    // Rescheduling states
    const [rescheduleAppointment, setRescheduleAppointment] = useState<AppointmentWithPatient | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduling, setRescheduling] = useState(false);

    const handleOpenReschedule = (app: AppointmentWithPatient) => {
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
            alert(t('common.success') || "Appointment rescheduled successfully!");
            setRescheduleAppointment(null);
            fetchAppointments();
        } catch (err: any) {
            console.error(err);
            alert(t('common.error') || "Failed to reschedule appointment.");
        } finally {
            setRescheduling(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateStatus = async (id: string, status: 'Accepted' | 'CANCELLED') => {
        const { error } = await supabase
            .from('Appointment')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error(error);
            alert(t('common.error'));
        } else {
            setAppointments(prev => prev.map(app =>
                app.id === id ? { ...app, status } : app
            ));
        }
    };

    if (loading) return <div>{t('dashboard.doctor.appointments.loading')}</div>;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>{t('dashboard.doctor.appointments.title')}</h2>

            {appointments.length === 0 ? (
                <div className={styles.noAppointments}>
                    <h3>{t('dashboard.doctor.appointments.no_appointments')}</h3>
                </div>
            ) : (
                <div className={styles.listGrid}>
                    {appointments.map((app) => (
                        <div key={app.id} className={styles.card}>
                            <div className={styles.patientInfo}>
                                <div className={styles.avatar}>
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className={styles.patientName}>{app.profiles?.full_name || t('dashboard.doctor.appointments.unknown_patient')}</h3>
                                    <div className={styles.dateTime}>
                                        <span className={styles.iconText}>
                                            <Calendar size={16} />
                                            {format(new Date(app.appointment_date), 'dd MMM yyyy')}
                                        </span>
                                        <span className={styles.iconText}>
                                            <Clock size={16} />
                                            {format(new Date(app.appointment_date), 'hh:mm a')}
                                        </span>
                                    </div>
                                    {app.reason && <p className={styles.reason}>{t('dashboard.doctor.appointments.reason')} "{app.reason}"</p>}

                                    <button
                                        onClick={() => navigate(`/dashboard/patient/${app.patient_id}`)}
                                        className={styles.viewProfileBtn}
                                    >
                                        {t('dashboard.doctor.appointments.view_profile')}
                                    </button>
                                </div>
                            </div>

                            <div className={styles.actions}>
                                {app.status === 'PENDING' && (
                                    <>
                                        <button
                                            onClick={() => updateStatus(app.id, 'Accepted')}
                                            className={styles.acceptBtn}
                                        >
                                            <CheckCircle size={18} /> {t('dashboard.doctor.appointments.accept')}
                                        </button>
                                        <button
                                            onClick={() => updateStatus(app.id, 'CANCELLED')}
                                            className={styles.declineBtn}
                                        >
                                            <XCircle size={18} /> {t('dashboard.doctor.appointments.decline')}
                                        </button>
                                    </>
                                )}

                                {(app.status === 'CONFIRMED' || app.status === 'Accepted') && (
                                    <span className={styles.statusConfirmed}>
                                        <CheckCircle size={20} weight="fill" /> {t('dashboard.doctor.appointments.confirmed')}
                                    </span>
                                )}

                                {app.status === 'CANCELLED' && (
                                    <span className={styles.statusCancelled}>
                                        <XCircle size={20} weight="fill" /> {t('dashboard.doctor.appointments.cancelled')}
                                    </span>
                                )}

                                {app.status !== 'CANCELLED' && (
                                    <button
                                        onClick={() => handleOpenReschedule(app)}
                                        className={styles.rescheduleBtn}
                                    >
                                        Reschedule
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reschedule Modal */}
            {rescheduleAppointment && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>Reschedule Appointment</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.25rem' }}>
                            Patient: {rescheduleAppointment.profiles?.full_name}
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