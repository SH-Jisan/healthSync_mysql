import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { User, Plus, Trash } from 'phosphor-react';
import styles from './styles/HospitalPatients.module.css';

interface PatientRow {
    id: string; // The relationship ID
    patient_id: string;
    admission_date: string;
    profiles: {
        full_name: string;
        email?: string;
        phone?: string;
    };
}

export default function HospitalPatients() {
    const { t } = useTranslation();
    const [patients, setPatients] = useState<PatientRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');

    const fetchPatients = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('hospital_patients')
            .select('id, patient_id, admission_date, profiles:patient_id(full_name, email, phone)')
            .eq('hospital_id', user.id);

        if (data) setPatients(data as unknown as PatientRow[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fetchPatients();
    }, [fetchPatients]);

    const admitPatient = async () => {
        if (!searchEmail) return;

        try {
            // 1. Find Patient
            const { data: patientProfile } = await supabase.from('User').select('id').eq('email', searchEmail).single();
            if (!patientProfile) return alert(t('common.error'));

            // 2. Admit
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('hospital_patients').insert({
                hospital_id: user?.id,
                patient_id: patientProfile.id,
                admission_date: new Date().toISOString()
            });

            alert(t('common.success'));
            setShowModal(false);
            setSearchEmail('');
            await fetchPatients();
        } catch (error) {
            console.error(error);
            alert(t('common.error'));
        }
    };

    const dischargePatient = async (id: string) => {
        if (!confirm(t('dashboard.hospital.patients.discharge_confirm'))) return;
        await supabase.from('hospital_patients').delete().eq('id', id);
        setPatients(prev => prev.filter(p => p.id !== id));
    };

    if (loading) return <div>{t('dashboard.hospital.patients.loading')}</div>;

    return (
        <div>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('dashboard.hospital.patients.title')}</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className={styles.addBtn}
                >
                    <Plus size={20} /> {t('dashboard.hospital.patients.admit_new')}
                </button>
            </div>

            {patients.length === 0 ? (
                <div className={styles.noPatients}>
                    {t('dashboard.hospital.patients.no_patients')}
                </div>
            ) : (
                <div className={styles.grid}>
                    {patients.map(p => (
                        <div key={p.id} className={styles.card}>
                            <div className={styles.avatar}>
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className={styles.patientName}>{p.profiles?.full_name}</h3>
                                <p className={styles.patientContact}>{p.profiles?.phone || p.profiles?.email}</p>
                                <span className={styles.admissionDate}>{t('dashboard.hospital.patients.admitted_date')} {new Date(p.admission_date).toLocaleDateString()}</span>
                            </div>

                            <button
                                onClick={() => dischargePatient(p.id)}
                                className={styles.dischargeBtn}
                            >
                                <Trash size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>{t('dashboard.hospital.patients.add_modal_title')}</h3>
                        <input
                            placeholder={t('dashboard.hospital.patients.email_placeholder')}
                            value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                            className={styles.input}
                        />
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className={styles.cancelBtn}>{t('common.cancel')}</button>
                            <button onClick={admitPatient} className={styles.saveBtn}>{t('dashboard.hospital.patients.admit')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}