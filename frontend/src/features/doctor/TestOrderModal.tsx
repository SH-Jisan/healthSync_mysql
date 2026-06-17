import { useState, useEffect } from 'react';
import { X, CheckCircle, Flask } from 'phosphor-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { useTranslation } from 'react-i18next';
import styles from './styles/DoctorModals.module.css';

interface Props {
    patientId: string;
    onClose: () => void;
    onSuccess: () => void;
}

interface Test {
    id: string;
    name: string;
    base_price: number;
}

export default function TestOrderModal({ patientId, onClose, onSuccess }: Props) {
    const { t } = useTranslation();
    const [availableTests, setAvailableTests] = useState<Test[]>([]);
    const [selectedTests, setSelectedTests] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchTests = async () => {
            const { data } = await supabase.from('MedicalTest').select('*').order('name');
            if (data) setAvailableTests(data);
            setLoading(false);
        };
        fetchTests();
    }, []);

    const toggleTest = (testName: string) => {
        if (selectedTests.includes(testName)) {
            setSelectedTests(selectedTests.filter(t => t !== testName));
        } else {
            setSelectedTests([...selectedTests, testName]);
        }
    };

    const handleSubmit = async () => {
        if (selectedTests.length === 0) return alert("Select at least one test.");

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('medical_events').insert({
            patient_id: patientId,
            uploader_id: user.id,
            title: 'Diagnostic Test Order',
            event_type: 'TEST_ORDER',
            event_date: new Date().toISOString(),
            severity: 'MEDIUM',
            summary: 'Doctor advised the following diagnostic tests.',
            key_findings: selectedTests,
        });

        setSubmitting(false);
        if (error) {
            console.error(error);
            alert('Failed to assign tests.');
        } else {
            alert(t('dashboard.doctor.profile.success_alert') || 'Tests assigned successfully!');
            onSuccess();
            onClose();
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button onClick={onClose} className={styles.closeBtn}>
                    <X size={24} />
                </button>

                <h2>
                    <Flask size={32} color="var(--primary)" style={{ verticalAlign: 'middle', marginRight: '10px' }} />
                    {t('dashboard.doctor.profile.assign_test') || 'Assign Diagnostic Tests'}
                </h2>

                {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}>Loading tests...</div> : (
                    <>
                        <p className={styles.label} style={{ marginBottom: '10px' }}>
                            {t('dashboard.doctor.profile.select_tests') || 'Select Tests from List:'}
                        </p>

                        <div className={styles.testList}>
                            {availableTests.map(test => (
                                <div
                                    key={test.id}
                                    onClick={() => toggleTest(test.name)}
                                    className={`${styles.testItem} ${selectedTests.includes(test.name) ? styles.testItemSelected : ''}`}
                                >
                                    <span className={styles.testName}>{test.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {/* Optional: Show Price if needed */}
                                        {/* <small style={{color: '#64748b'}}>৳{test.base_price}</small> */}
                                        {selectedTests.includes(test.name) ? (
                                            <CheckCircle size={24} color="#16a34a" weight="fill" />
                                        ) : (
                                            <div style={{ width: 24, height: 24, border: '2px solid #cbd5e1', borderRadius: '50%' }} />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Selected: <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{selectedTests.length}</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        className={styles.submitBtn}
                        disabled={submitting || selectedTests.length === 0}
                        style={{ width: 'auto', padding: '12px 32px', margin: 0 }}
                    >
                        {submitting ? t('common.processing') : t('dashboard.doctor.profile.confirm_send')}
                    </button>
                </div>
            </div>
        </div>
    );
}