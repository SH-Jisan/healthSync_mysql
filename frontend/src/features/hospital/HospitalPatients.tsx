import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { User, Plus, CheckCircle, Warning, Clock, Info } from 'phosphor-react';
import styles from './styles/HospitalPatients.module.css';

interface PatientAdmission {
    id: string;
    patient_id: string;
    department_name: string;
    admission_type: 'EMERGENCY' | 'ROUTINE' | 'REFERRAL';
    status: 'PENDING' | 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED';
    notes?: string;
    admitted_at?: string;
    discharged_at?: string;
    created_at: string;
    patient?: {
        full_name: string;
        email?: string;
        phone?: string;
        blood_group?: string;
    };
}

export default function HospitalPatients() {
    const { t } = useTranslation();
    const [admissions, setAdmissions] = useState<PatientAdmission[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Add Admission modal states
    const [showModal, setShowModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [selectedDept, setSelectedDept] = useState('General Medicine');
    const [admissionType, setAdmissionType] = useState<'EMERGENCY' | 'ROUTINE' | 'REFERRAL'>('ROUTINE');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Discharge modal states
    const [showDischargeModal, setShowDischargeModal] = useState(false);
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [selectedAdmission, setSelectedAdmission] = useState<PatientAdmission | null>(null);

    const fetchAdmissions = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch admissions from patient_admissions
        const { data, error } = await supabase
            .from('patient_admissions')
            .select('id, patient_id, department_name, admission_type, status, notes, admitted_at, discharged_at, created_at, patient:patient_id(full_name, email, phone, blood_group)')
            .eq('hospital_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAdmissions(data as unknown as PatientAdmission[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAdmissions();
    }, [fetchAdmissions]);

    const admitPatient = async () => {
        if (!searchEmail) return alert('Patient email is required.');
        setSubmitting(true);

        try {
            // 1. Find Patient
            const { data: patientProfile } = await supabase
                .from('User')
                .select('id')
                .eq('email', searchEmail)
                .single();

            if (!patientProfile) {
                alert('Patient profile not found in HealthSync records.');
                setSubmitting(false);
                return;
            }

            // Check if patient already has an active admission in this hospital
            const isAlreadyAdmitted = admissions.some(a => a.patient_id === patientProfile.id && ['PENDING', 'ADMITTED'].trim().includes(a.status));
            if (isAlreadyAdmitted) {
                alert('This patient is already admitted or has a pending admission request.');
                setSubmitting(false);
                return;
            }

            // 2. Insert Admission
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Auto-approve routine and referral admissions, but mark emergencies as ADMITTED instantly
            const isEmergency = admissionType === 'EMERGENCY';
            const status = isEmergency ? 'ADMITTED' : 'PENDING';
            const admittedAt = isEmergency ? new Date().toISOString() : null;

            const { error } = await supabase
                .from('patient_admissions')
                .insert({
                    hospital_id: user.id,
                    patient_id: patientProfile.id,
                    department_name: selectedDept,
                    admission_type: admissionType,
                    status: status,
                    notes: notes,
                    admitted_at: admittedAt
                });

            if (error) throw error;

            // Link patient to hospital_patients if admitted
            if (status === 'ADMITTED') {
                await supabase.from('hospital_patients').insert({
                    hospital_id: user.id,
                    patient_id: patientProfile.id
                });
            }

            alert(isEmergency ? 'Patient admitted successfully.' : 'Admission request submitted. Pending review.');
            setShowModal(false);
            setSearchEmail('');
            setNotes('');
            await fetchAdmissions();
        } catch (error: any) {
            console.error('Failed to create patient admission:', error);
            alert('Failed to process admission: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveAdmission = async (admission: PatientAdmission) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Update admission status
            const { error } = await supabase
                .from('patient_admissions')
                .update({
                    status: 'ADMITTED',
                    admitted_at: new Date().toISOString()
                })
                .eq('id', admission.id);

            if (error) throw error;

            // 2. Link Patient to hospital roster
            await supabase.from('hospital_patients').insert({
                hospital_id: user.id,
                patient_id: admission.patient_id
            });

            alert('Admission request approved successfully.');
            await fetchAdmissions();
        } catch (err: any) {
            console.error('Failed to approve admission:', err);
            alert('Failed to approve admission: ' + err.message);
        }
    };

    const handleDischargePatient = async () => {
        if (!selectedAdmission || !dischargeNotes) return;
        setSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Update patient_admissions status
            const { error: admissionError } = await supabase
                .from('patient_admissions')
                .update({
                    status: 'DISCHARGED',
                    discharged_at: new Date().toISOString(),
                    notes: dischargeNotes
                })
                .eq('id', selectedAdmission.id);

            if (admissionError) throw admissionError;

            // 2. Remove patient from active hospital patients list
            await supabase
                .from('hospital_patients')
                .delete()
                .eq('hospital_id', user.id)
                .eq('patient_id', selectedAdmission.patient_id);

            // 3. Free any allocated bed
            await supabase
                .from('hospital_beds')
                .update({
                    status: 'CLEANING',
                    patient_id: null,
                    assigned_doctor_id: null,
                    admitted_at: null
                })
                .eq('hospital_id', user.id)
                .eq('patient_id', selectedAdmission.patient_id);

            // 4. Create medical timeline entry (Discharge Summary report)
            await supabase
                .from('medical_events')
                .insert({
                    patient_id: selectedAdmission.patient_id,
                    uploader_id: user.id,
                    title: `Discharge Summary - ${selectedAdmission.department_name}`,
                    event_type: 'REPORT',
                    event_date: new Date().toISOString().split('T')[0],
                    severity: 'LOW',
                    summary: `Patient discharged from ${selectedAdmission.department_name}. Discharge Summary Notes: ${dischargeNotes}`
                });

            alert('Patient discharged successfully. Discharge Summary added to Timeline.');
            setShowDischargeModal(false);
            setDischargeNotes('');
            await fetchAdmissions();
        } catch (error: any) {
            console.error('Failed to discharge patient:', error);
            alert('Failed to complete discharge: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading inpatient admissions...</div>;

    const activeInpatients = admissions.filter(a => a.status === 'ADMITTED');
    const pendingAdmissions = admissions.filter(a => a.status === 'PENDING');
    const dischargedHistory = admissions.filter(a => a.status === 'DISCHARGED');

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Patient Admission & Discharges</h2>
                    <p className={styles.subtitle}>Process hospital admissions, bed assignments, and medical discharge releases.</p>
                </div>
                <button
                    onClick={() => {
                        setSearchEmail('');
                        setNotes('');
                        setShowModal(true);
                    }}
                    className={styles.addBtn}
                >
                    <Plus size={18} /> Register Admission
                </button>
            </div>

            {/* Active Inpatients Section */}
            <div className={styles.sectionHeader}>
                <CheckCircle size={20} />
                <h3>Active Inpatients ({activeInpatients.length})</h3>
            </div>

            {activeInpatients.length === 0 ? (
                <div className={styles.emptyCard}>
                    <Info size={32} />
                    <p>No active inpatients in wards. Admit patients to assign beds and start treatment plans.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {activeInpatients.map(a => (
                        <div key={a.id} className={`${styles.card} t-card`}>
                            <div className={styles.cardTop}>
                                <div className={styles.avatar}>
                                    <User size={24} />
                                </div>
                                <div className={styles.info}>
                                    <h3 className={styles.patientName}>{a.patient?.full_name}</h3>
                                    <span className="t-badge t-badge-info">{a.department_name} ({a.admission_type})</span>
                                </div>
                            </div>

                            <div className={styles.cardDetails}>
                                <div className={styles.detailRow}>
                                    <span>Blood Group:</span>
                                    <strong>{a.patient?.blood_group || 'N/A'}</strong>
                                </div>
                                <div className={styles.detailRow}>
                                    <span>Contact:</span>
                                    <strong>{a.patient?.phone || a.patient?.email || 'N/A'}</strong>
                                </div>
                                <div className={styles.detailRow}>
                                    <span>Admitted At:</span>
                                    <strong>{a.admitted_at ? new Date(a.admitted_at).toLocaleString() : 'N/A'}</strong>
                                </div>
                            </div>

                            <div className={styles.actions} style={{ marginTop: '16px' }}>
                                <button
                                    onClick={() => {
                                        setSelectedAdmission(a);
                                        setDischargeNotes('');
                                        setShowDischargeModal(true);
                                    }}
                                    className="t-btn t-btn-danger"
                                    style={{ width: '100%' }}
                                >
                                    Discharge & Write Summary
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pending Admission Requests Section */}
            <div className={styles.sectionHeader} style={{ marginTop: '32px' }}>
                <Clock size={20} />
                <h3>Pending Admission Reviews ({pendingAdmissions.length})</h3>
            </div>

            {pendingAdmissions.length === 0 ? (
                <p className={styles.noDataText}>No pending admission requests.</p>
            ) : (
                <div className={styles.grid}>
                    {pendingAdmissions.map(a => (
                        <div key={a.id} className={`${styles.card} t-card`} style={{ opacity: 0.9 }}>
                            <div className={styles.cardTop}>
                                <div className={styles.avatar} style={{ backgroundColor: '#475569' }}>
                                    <Clock size={24} />
                                </div>
                                <div className={styles.info}>
                                    <h3 className={styles.patientName}>{a.patient?.full_name}</h3>
                                    <span className="t-badge t-badge-secondary">{a.department_name} ({a.admission_type})</span>
                                </div>
                            </div>
                            <div className={styles.cardDetails}>
                                <p className={styles.notesText}>Notes: "{a.notes || 'None'}"</p>
                                <small>Requested: {new Date(a.created_at).toLocaleDateString()}</small>
                            </div>
                            <div className={styles.actions} style={{ marginTop: '16px' }}>
                                <button
                                    onClick={() => handleApproveAdmission(a)}
                                    className="t-btn t-btn-success"
                                    style={{ width: '100%' }}
                                >
                                    Approve Inpatient Admission
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Discharged History Section */}
            {dischargedHistory.length > 0 && (
                <>
                    <div className={styles.sectionHeader} style={{ marginTop: '32px' }}>
                        <Warning size={20} />
                        <h3>Recent Discharges (History)</h3>
                    </div>
                    <div className={styles.grid}>
                        {dischargedHistory.slice(0, 5).map(a => (
                            <div key={a.id} className={`${styles.card} t-card`} style={{ opacity: 0.6 }}>
                                <div className={styles.cardTop}>
                                    <div className={styles.avatar} style={{ backgroundColor: '#334155' }}>
                                        <User size={24} />
                                    </div>
                                    <div className={styles.info}>
                                        <h3 className={styles.patientName}>{a.patient?.full_name}</h3>
                                        <span className="t-badge t-badge-success">DISCHARGED</span>
                                    </div>
                                </div>
                                <div className={styles.cardDetails}>
                                    <p className={styles.notesText}>Summary: "{a.notes || 'No summary notes'}"</p>
                                    <small>Discharged: {a.discharged_at ? new Date(a.discharged_at).toLocaleDateString() : 'N/A'}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Register Admission Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Admit New Inpatient</h3>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Patient's Registered Email</label>
                            <input
                                type="email"
                                placeholder="patient@healthsync.com"
                                value={searchEmail}
                                onChange={e => setSearchEmail(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Target Department</label>
                            <select
                                value={selectedDept}
                                onChange={e => setSelectedDept(e.target.value)}
                                className={styles.select}
                            >
                                <option value="Cardiology">Cardiology</option>
                                <option value="Pediatrics">Pediatrics</option>
                                <option value="Neurology">Neurology</option>
                                <option value="Gynecology">Gynecology</option>
                                <option value="Nephrology">Nephrology</option>
                                <option value="Immunology">Immunology</option>
                                <option value="General Medicine">General Medicine</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Admission Priority / Type</label>
                            <select
                                value={admissionType}
                                onChange={e => setAdmissionType(e.target.value as any)}
                                className={styles.select}
                            >
                                <option value="ROUTINE">Routine Inpatient</option>
                                <option value="EMERGENCY">Emergency ICU/Ward (Instant Admission)</option>
                                <option value="REFERRAL">Department Referral Link</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Admission Notes / Clinical Reasons</label>
                            <textarea
                                placeholder="Details about patient condition, primary diagnosis, or reference info..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className={styles.textarea}
                                rows={3}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className="t-btn t-btn-secondary" disabled={submitting}>
                                Cancel
                            </button>
                            <button onClick={admitPatient} className="t-btn t-btn-primary" disabled={submitting || !searchEmail}>
                                {submitting ? 'Registering...' : 'Register Admission'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Discharge Summary Modal */}
            {showDischargeModal && selectedAdmission && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Generate Discharge Summary</h3>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
                            Discharging: <strong>{selectedAdmission.patient?.full_name}</strong>
                        </p>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Discharge Instructions / Summary Notes</label>
                            <textarea
                                placeholder="Write final diagnostics, active prescription advice, follow-up timelines, and self-care instructions..."
                                value={dischargeNotes}
                                onChange={e => setDischargeNotes(e.target.value)}
                                className={styles.textarea}
                                rows={6}
                                required
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setShowDischargeModal(false)} className="t-btn t-btn-secondary" disabled={submitting}>
                                Cancel
                            </button>
                            <button 
                                onClick={handleDischargePatient} 
                                className="t-btn t-btn-danger" 
                                disabled={submitting || !dischargeNotes}
                            >
                                {submitting ? 'Discharging...' : 'Confirm Release & Save Summary'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}