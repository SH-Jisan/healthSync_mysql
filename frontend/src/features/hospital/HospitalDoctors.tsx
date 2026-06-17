import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { User, Plus, Trash } from 'phosphor-react';
import styles from './styles/HospitalDoctors.module.css';

interface DoctorRow {
    id: string; // The relationship ID
    doctor_id: string;
    profiles: {
        full_name: string;
        specialty?: string;
    };
}

export default function HospitalDoctors() {
    const { t } = useTranslation();
    const [doctors, setDoctors] = useState<DoctorRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');

    const fetchDoctors = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('HospitalDoctor')
            .select('id, doctor_id, profiles:doctor_id(full_name, specialty)')
            .eq('hospital_id', user.id);

        if (data) setDoctors(data as unknown as DoctorRow[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        fetchDoctors();
    }, [fetchDoctors]);

    const addDoctor = async () => {
        if (!searchEmail) return;

        try {
            // 1. Find Doctor by Email
            const { data: doctorProfile } = await supabase.from('User').select('id').eq('email', searchEmail).single();
            if (!doctorProfile) return alert(t('common.error'));

            // 2. Add to Hospital
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('HospitalDoctor').insert({
                hospital_id: user?.id,
                doctor_id: doctorProfile.id
            });

            alert(t('common.success'));
            setShowModal(false);
            setSearchEmail('');
            await fetchDoctors();
        } catch (error) {
            console.error(error);
            alert(t('common.error'));
        }
    };

    const removeDoctor = async (id: string) => {
        if (!confirm(t('dashboard.hospital.doctors.remove_confirm'))) return;
        await supabase.from('HospitalDoctor').delete().eq('id', id);
        setDoctors(prev => prev.filter(d => d.id !== id));
    };

    if (loading) return <div>{t('dashboard.hospital.doctors.loading')}</div>;

    return (
        <div>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('dashboard.hospital.doctors.title')}</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className={styles.addBtn}
                >
                    <Plus size={20} /> {t('dashboard.hospital.doctors.add_new')}
                </button>
            </div>

            {doctors.length === 0 ? (
                <div className={styles.noDoctors}>
                    {t('dashboard.hospital.doctors.no_doctors')}
                </div>
            ) : (
                <div className={styles.grid}>
                    {doctors.map(d => (
                        <div key={d.id} className={styles.card}>
                            <div className={styles.avatar}>
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className={styles.doctorName}>{d.profiles?.full_name}</h3>
                                <p className={styles.specialty}>{d.profiles?.specialty}</p>
                            </div>

                            <button
                                onClick={() => removeDoctor(d.id)}
                                className={styles.removeBtn}
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
                        <h3>{t('dashboard.hospital.doctors.add_modal_title')}</h3>
                        <input
                            placeholder={t('dashboard.hospital.doctors.email_placeholder')}
                            value={searchEmail} onChange={e => setSearchEmail(e.target.value)}
                            className={styles.input}
                        />
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className={styles.cancelBtn}>{t('common.cancel')}</button>
                            <button onClick={addDoctor} className={styles.saveBtn}>{t('dashboard.hospital.doctors.add_new')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}