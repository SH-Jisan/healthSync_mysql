import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { User, Plus, Trash, Clock, CheckCircle, Warning, FolderSimple, Info } from 'phosphor-react';
import styles from './styles/HospitalDoctors.module.css';

interface DoctorInvitation {
    id: string;
    doctor_id: string;
    department_name: string;
    employment_type: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'TERMINATED';
    notes?: string;
    created_at: string;
    doctor?: {
        full_name: string;
        specialty?: string;
        license_number?: string;
        license_status?: string;
        email: string;
    };
}

export default function HospitalDoctors() {
    const { t } = useTranslation();
    const [invitations, setInvitations] = useState<DoctorInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [selectedDept, setSelectedDept] = useState('General Medicine');
    const [employmentType, setEmploymentType] = useState('FULL_TIME');
    const [inviteNotes, setInviteNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchInvitations = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch invitations with doctor details
        const { data, error } = await supabase
            .from('hospital_doctor_invitations')
            .select('id, doctor_id, department_name, employment_type, status, notes, created_at, doctor:doctor_id(full_name, specialty, license_number, license_status, email)')
            .eq('hospital_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setInvitations(data as unknown as DoctorInvitation[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const sendInvitation = async () => {
        if (!searchEmail) return alert('Doctor email is required.');
        setSubmitting(true);

        try {
            // 1. Fetch Doctor by email
            const { data: doctorProfile } = await supabase
                .from('User')
                .select('id, role')
                .eq('email', searchEmail)
                .single();

            if (!doctorProfile) {
                alert('Doctor profile not found in HealthSync records.');
                setSubmitting(false);
                return;
            }

            if (doctorProfile.role !== 'DOCTOR') {
                alert('This user is not registered with the role of DOCTOR.');
                setSubmitting(false);
                return;
            }

            // 2. Check if active/pending invitation already exists
            const duplicate = invitations.some(i => i.doctor_id === doctorProfile.id && ['PENDING', 'APPROVED'].includes(i.status));
            if (duplicate) {
                alert('An active invitation or staff linkage already exists for this doctor.');
                setSubmitting(false);
                return;
            }

            // 3. Create invitation
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('hospital_doctor_invitations')
                .insert({
                    hospital_id: user.id,
                    doctor_id: doctorProfile.id,
                    department_name: selectedDept,
                    employment_type: employmentType,
                    status: 'PENDING',
                    notes: inviteNotes
                });

            if (error) throw error;

            alert('Affiliation invitation successfully sent to doctor.');
            setShowModal(false);
            setSearchEmail('');
            setInviteNotes('');
            await fetchInvitations();
        } catch (error: any) {
            console.error('Failed to invite doctor:', error);
            alert('Failed to send invitation: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (inviteId: string, status: 'APPROVED' | 'SUSPENDED' | 'TERMINATED') => {
        const actionText = status === 'SUSPENDED' ? 'suspend' : status === 'TERMINATED' ? 'terminate' : 'reactivate';
        if (!confirm(`Are you sure you want to ${actionText} this doctor's departmental linkage?`)) return;

        try {
            const { error } = await supabase
                .from('hospital_doctor_invitations')
                .update({ status })
                .eq('id', inviteId);

            if (error) throw error;
            alert(`Doctor successfully ${status.toLowerCase()}.`);
            await fetchInvitations();
        } catch (err: any) {
            console.error('Failed to update doctor link status:', err);
            alert('Failed to change status: ' + err.message);
        }
    };

    if (loading) return <div className={styles.loading}>Loading clinical roster...</div>;

    const approvedDoctors = invitations.filter(i => i.status === 'APPROVED');
    const pendingInvites = invitations.filter(i => i.status === 'PENDING');
    const inactiveRoster = invitations.filter(i => ['SUSPENDED', 'TERMINATED', 'REJECTED'].includes(i.status));

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Medical Staff & Departments</h2>
                    <p className={styles.subtitle}>Manage doctor applications, credentials, and departmental rosters.</p>
                </div>
                <button
                    onClick={() => {
                        setSearchEmail('');
                        setInviteNotes('');
                        setShowModal(true);
                    }}
                    className={styles.addBtn}
                >
                    <Plus size={18} /> Invite Medical Staff
                </button>
            </div>

            {/* Active Doctors Section */}
            <div className={styles.sectionHeader}>
                <FolderSimple size={20} />
                <h3>Active Departmental Roster ({approvedDoctors.length})</h3>
            </div>

            {approvedDoctors.length === 0 ? (
                <div className={styles.emptyCard}>
                    <Info size={32} />
                    <p>No active doctors linked to hospital departments. Send invitations to register clinical staff.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {approvedDoctors.map(invite => (
                        <div key={invite.id} className={`${styles.card} t-card`}>
                            <div className={styles.cardTop}>
                                <div className={styles.avatar}>
                                    <User size={24} />
                                </div>
                                <div className={styles.info}>
                                    <h3 className={styles.doctorName}>{invite.doctor?.full_name}</h3>
                                    <span className="t-badge t-badge-info" style={{ textTransform: 'uppercase' }}>
                                        {invite.department_name} ({invite.employment_type.replace('_', ' ')})
                                    </span>
                                </div>
                            </div>
                            
                            <div className={styles.cardDetails}>
                                <div className={styles.detailRow}>
                                    <span>Specialty:</span>
                                    <strong>{invite.doctor?.specialty || 'General Practitioner'}</strong>
                                </div>
                                <div className={styles.detailRow}>
                                    <span>License Status:</span>
                                    <span className={`t-badge ${invite.doctor?.license_status === 'VERIFIED' ? 't-badge-success' : 't-badge-warning'}`}>
                                        {invite.doctor?.license_status || 'PENDING'}
                                    </span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span>License Number:</span>
                                    <strong>{invite.doctor?.license_number || 'N/A'}</strong>
                                </div>
                            </div>

                            <div className={styles.actions} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button
                                    onClick={() => handleUpdateStatus(invite.id, 'SUSPENDED')}
                                    className="t-btn t-btn-warning"
                                    style={{ flex: 1, fontSize: '12px' }}
                                >
                                    Suspend
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(invite.id, 'TERMINATED')}
                                    className="t-btn t-btn-danger"
                                    style={{ flex: 1, fontSize: '12px' }}
                                >
                                    Terminate
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pending Invitations Section */}
            <div className={styles.sectionHeader} style={{ marginTop: '32px' }}>
                <Clock size={20} />
                <h3>Pending Affiliation Invites ({pendingInvites.length})</h3>
            </div>

            {pendingInvites.length === 0 ? (
                <p className={styles.noDataText}>No pending doctor invitations.</p>
            ) : (
                <div className={styles.grid}>
                    {pendingInvites.map(invite => (
                        <div key={invite.id} className={`${styles.card} t-card`} style={{ opacity: 0.85 }}>
                            <div className={styles.cardTop}>
                                <div className={styles.avatar} style={{ backgroundColor: '#475569' }}>
                                    <Clock size={24} />
                                </div>
                                <div className={styles.info}>
                                    <h3 className={styles.doctorName}>{invite.doctor?.full_name || 'Invited Doctor'}</h3>
                                    <span className="t-badge t-badge-secondary">{invite.department_name}</span>
                                </div>
                            </div>
                            <div className={styles.cardDetails}>
                                <p className={styles.emailText}>Email: {invite.doctor?.email}</p>
                                {invite.notes && <p className={styles.notesText}>Notes: "{invite.notes}"</p>}
                                <small>Sent: {new Date(invite.created_at).toLocaleDateString()}</small>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Inactive & Terminated Section */}
            {inactiveRoster.length > 0 && (
                <>
                    <div className={styles.sectionHeader} style={{ marginTop: '32px' }}>
                        <Warning size={20} />
                        <h3>Inactive & Suspended Staff</h3>
                    </div>
                    <div className={styles.grid}>
                        {inactiveRoster.map(invite => (
                            <div key={invite.id} className={`${styles.card} t-card`} style={{ opacity: 0.6, borderLeft: '4px solid #ef4444' }}>
                                <div className={styles.cardTop}>
                                    <div className={styles.avatar} style={{ backgroundColor: '#ef4444' }}>
                                        <User size={24} />
                                    </div>
                                    <div className={styles.info}>
                                        <h3 className={styles.doctorName}>{invite.doctor?.full_name}</h3>
                                        <span className="t-badge t-badge-danger">{invite.status.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className={styles.actions} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <button
                                        onClick={() => handleUpdateStatus(invite.id, 'APPROVED')}
                                        className="t-btn t-btn-success"
                                        style={{ width: '100%', fontSize: '12px' }}
                                    >
                                        Reactivate Linkage
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Invite Doctor Modal */}
            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Invite Doctor to Hospital</h3>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Doctor's Registered Email</label>
                            <input
                                type="email"
                                placeholder="doctor@healthsync.com"
                                value={searchEmail}
                                onChange={e => setSearchEmail(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Assign Clinical Department</label>
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
                            <label className={styles.label}>Employment Roster Type</label>
                            <select
                                value={employmentType}
                                onChange={e => setEmploymentType(e.target.value)}
                                className={styles.select}
                            >
                                <option value="FULL_TIME">Full-Time Staff</option>
                                <option value="PART_TIME">Part-Time Consultant</option>
                                <option value="CONTRACT">Contract Basis</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Staff Welcome/Reference Notes</label>
                            <textarea
                                placeholder="Add any chamber schedules or internal room assignment directions..."
                                value={inviteNotes}
                                onChange={e => setInviteNotes(e.target.value)}
                                className={styles.textarea}
                                rows={3}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className="t-btn t-btn-secondary" disabled={submitting}>
                                Cancel
                            </button>
                            <button onClick={sendInvitation} className="t-btn t-btn-primary" disabled={submitting || !searchEmail}>
                                {submitting ? 'Sending...' : 'Send Affiliation Invitation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}