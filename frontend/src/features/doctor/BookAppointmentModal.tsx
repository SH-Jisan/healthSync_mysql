import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { X, CalendarCheck } from 'phosphor-react';
import type { Doctor } from '../../types';
import styles from './styles/BookAppointmentModal.module.css';

interface Props {
    doctor: Doctor;
    onClose: () => void;
}

export default function BookAppointmentModal({ doctor, onClose }: Props) {
    const { t } = useTranslation();
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error(t('book_appointment.login_error'));

            const appointmentDateTime = new Date(`${date}T${time}`).toISOString();

            const { error } = await supabase.from('Appointment').insert({
                doctor_id: doctor.id,
                patient_id: user.id,
                appointment_date: appointmentDateTime,
                reason: reason,
                status: 'PENDING'
            });

            if (error) throw error;

            alert(t('book_appointment.success', { name: doctor.full_name }));
            onClose();

        } catch (err: any) {
            console.error('Booking Error:', err);
            if (err.message) {
                alert(err.message);
            } else {
                alert(t('book_appointment.error_generic', 'Failed to book appointment. Please try again.'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <button onClick={onClose} className={styles.closeBtn}>
                    <X size={24} />
                </button>

                <h3 className={styles.title}>{t('book_appointment.title')}</h3>
                <p className={styles.subtitle}>{t('book_appointment.with')} <strong>Dr. {doctor.full_name}</strong></p>

                <form onSubmit={handleBook} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label>{t('book_appointment.date')}</label>
                        <input
                            type="date" required
                            value={date} onChange={e => setDate(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>{t('book_appointment.time')}</label>
                        <input
                            type="time" required
                            value={time} onChange={e => setTime(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>{t('book_appointment.reason')}</label>
                        <textarea
                            rows={3} required
                            value={reason} onChange={e => setReason(e.target.value)}
                            placeholder={t('book_appointment.reason_placeholder')}
                            className={styles.textarea}
                        />
                    </div>

                    <button type="submit" disabled={loading} className={styles.confirmBtn}>
                        <CalendarCheck size={20} />
                        {loading ? t('book_appointment.booking') : t('book_appointment.confirm_btn')}
                    </button>
                </form>
            </div>
        </div>
    );
}