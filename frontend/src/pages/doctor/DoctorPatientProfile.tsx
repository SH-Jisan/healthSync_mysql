import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import TimelineView from '@/features/timeline/TimelineView';
import { ArrowLeft, Phone, Drop, MapPin, Flask, Prescription, Calendar, Clock } from 'phosphor-react';
import PrescriptionModal from '@/features/doctor/PrescriptionModal';
// [NEW] Shared Modal ব্যবহার করা হচ্ছে
import SharedTestModal from '@/features/dashboard/widgets/SharedTestModal';
import styles from './DoctorPatientProfile.module.css';

interface PatientProfile {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    blood_group?: string;
    district?: string;
    dob?: string;
}

export default function DoctorPatientProfile() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<PatientProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

    // Shared Modal State
    const [showTestModal, setShowTestModal] = useState(false);

    const [refreshTimeline, setRefreshTimeline] = useState(0);

    useEffect(() => {
        if (id) {
            const fetchPatient = async () => {
                const { data } = await supabase.from('User').select('*').eq('id', id).single();
                if (data) setPatient(data as PatientProfile);
                setLoading(false);
            };
            fetchPatient();
        }
    }, [id]);

    const handleActionSuccess = () => {
        setRefreshTimeline(prev => prev + 1);
    };

    const getAge = (dob?: string) => {
        if (!dob) return 'N/A';
        return new Date().getFullYear() - new Date(dob).getFullYear();
    };

    if (loading) return <div>{t('common.loading') || 'Loading...'}</div>;
    if (!patient) return <div>{t('dashboard.doctor.profile.not_found')}</div>;

    return (
        <div className={styles.container}>
            <button onClick={() => navigate(-1)} className={styles.backBtn}>
                <ArrowLeft size={20} /> {t('dashboard.doctor.profile.back')}
            </button>

            <div className={styles.headerCard}>
                <div className={styles.avatar}>{patient.full_name?.[0]}</div>
                <div className={styles.patientInfo}>
                    <h1>{patient.full_name}</h1>
                    <p className={styles.contactText}><Phone size={16} weight="fill" style={{ marginRight: 6 }} />{patient.phone || patient.email}</p>
                    <div className={styles.badges}>
                        {patient.blood_group && <span className={styles.bloodBadge}><Drop size={16} weight="fill" style={{ marginRight: 4 }} />{patient.blood_group}</span>}
                        <span className={styles.locationBadge}><MapPin size={16} weight="fill" style={{ marginRight: 4 }} />{patient.district || t('dashboard.doctor.profile.unknown_location')}</span>
                    </div>
                </div>
            </div>

            <div className={styles.layoutGrid}>
                <div>
                    <TimelineView userId={id!} key={refreshTimeline} />
                </div>

                <div className={styles.sidebar}>
                    <div className={styles.actionCard}>
                        <h3>{t('dashboard.doctor.profile.actions_title') || 'Doctor Actions'}</h3>

                        {/* Assign Test Button using SharedModal */}
                        <button
                            className={styles.actionBtn}
                            onClick={() => setShowTestModal(true)}
                            style={{ background: '#EEF2FF', color: '#4338ca', borderColor: '#C7D2FE' }}
                        >
                            <Flask size={32} weight="duotone" />
                            <div><strong>{t('dashboard.doctor.profile.assign_test') || 'Assign Tests'}</strong><span>{t('dashboard.doctor.profile.order_diagnostics_desc')}</span></div>
                        </button>

                        <button
                            className={styles.actionBtn}
                            onClick={() => setShowPrescriptionModal(true)}
                            style={{ background: '#ECFDF5', color: '#047857', borderColor: '#6EE7B7' }}
                        >
                            <Prescription size={32} weight="duotone" />
                            <div><strong>{t('dashboard.doctor.profile.write_rx') || 'Write Prescription'}</strong><span>{t('dashboard.doctor.profile.write_rx_desc')}</span></div>
                        </button>

                        <div className={styles.infoBlock}>
                            <h4>{t('dashboard.doctor.profile.patient_info')}</h4>
                            <div className={styles.statRow}><Calendar size={20} /><span>{t('dashboard.doctor.profile.age', { age: getAge(patient.dob) })}</span></div>
                            <div className={styles.statRow}><Clock size={20} /><span>{t('dashboard.doctor.profile.last_visit', { visit: 'Today' })}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {showPrescriptionModal && id && <PrescriptionModal patientId={id} onClose={() => setShowPrescriptionModal(false)} onSuccess={handleActionSuccess} />}

            {/* [UPDATED] Using SharedTestModal with role="DOCTOR" */}
            {showTestModal && id && (
                <SharedTestModal
                    patientId={id}
                    role="DOCTOR"
                    onClose={() => setShowTestModal(false)}
                    onSuccess={handleActionSuccess}
                />
            )}
        </div>
    );
}