import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { User, Trash } from 'phosphor-react';
import styles from './styles/DiagnosticPatients.module.css';

export interface Patient {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
}

interface Props {
    onSelectPatient: (patient: Patient) => void;
}

export default function DiagnosticPatients({ onSelectPatient }: Props) {
    const { t } = useTranslation();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPatients = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('diagnostic_patients')
            .select('patient:patient_id(*)')
            .eq('diagnostic_id', user.id);

        if (data) setPatients(data.map((d: any) => d.patient) as unknown as Patient[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleRemovePatient = async (e: React.MouseEvent, patientId: string, patientName: string) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to remove ${patientName} from your diagnostic patients list?`)) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('diagnostic_patients')
                .delete()
                .eq('diagnostic_id', user.id)
                .eq('patient_id', patientId);

            if (error) throw error;
            alert("Patient removed successfully.");
            fetchPatients();
        } catch (err: any) {
            console.error(err);
            alert("Failed to remove patient: " + err.message);
        }
    };

    if (loading) return <div>{t('common.loading')}</div>;

    return (
        <div>
            {patients.length === 0 ? <p>{t('dashboard.diagnostic.patients.no_assigned')}</p> : (
                <div className={styles.grid}>
                    {patients.map(p => (
                        <div
                            key={p.id}
                            onClick={() => onSelectPatient(p)}
                            className={styles.card}
                        >
                            <div className={styles.avatar}>
                                <User size={20} color="var(--primary)" />
                            </div>
                            <div className={styles.info}>
                                <h4>{p.full_name}</h4>
                                <small>{p.email}</small>
                            </div>
                            <button
                                onClick={(e) => handleRemovePatient(e, p.id, p.full_name)}
                                className={styles.removeBtn}
                                title="Remove Patient"
                            >
                                <Trash size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}