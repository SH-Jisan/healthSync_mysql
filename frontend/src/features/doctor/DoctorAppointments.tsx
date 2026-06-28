import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { CheckCircle, XCircle, Clock, User, Calendar, PlusCircle, AirplaneTakeoff, Info } from 'phosphor-react';
import { format } from 'date-fns';
import styles from './styles/DoctorAppointments.module.css';

interface AppointmentWithPatient {
    id: string;
    patient_id: string;
    doctor_id: string;
    appointment_date: string;
    status: 'PENDING' | 'Accepted' | 'CONFIRMED' | 'CHECKED_IN' | 'CONSULTATION' | 'COMPLETED' | 'CANCELLED';
    reason?: string;
    token_number?: number;
    profiles?: {
        full_name: string;
        phone: string;
        blood_group?: string;
    } | null;
}

interface DoctorLeave {
    id: string;
    start_date: string;
    end_date: string;
    leave_type: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reason?: string;
}

export default function DoctorAppointments() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [leaves, setLeaves] = useState<DoctorLeave[]>([]);
    const [loading, setLoading] = useState(true);

    // Leaves form states
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveType, setLeaveType] = useState('CASUAL');
    const [leaveReason, setLeaveReason] = useState('');
    const [submittingLeave, setSubmittingLeave] = useState(false);

    // Rescheduling states
    const [rescheduleAppointment, setRescheduleAppointment] = useState<AppointmentWithPatient | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduling, setRescheduling] = useState(false);

    const fetchAppointments = useCallback(async () => {
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
    }, []);

    const fetchLeaves = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('doctor_leaves')
            .select('*')
            .eq('doctor_id', user.id)
            .order('start_date', { ascending: true });

        if (!error && data) {
            setLeaves(data as DoctorLeave[]);
        }
    }, []);

    const loadAll = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchAppointments(), fetchLeaves()]);
        setLoading(false);
    }, [fetchAppointments, fetchLeaves]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

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
                .update({ appointment_date: rescheduleDate, status: 'CONFIRMED' })
                .eq('id', rescheduleAppointment.id);

            if (error) throw error;
            alert("Appointment rescheduled successfully!");
            setRescheduleAppointment(null);
            await fetchAppointments();
        } catch (err: any) {
            console.error(err);
            alert("Failed to reschedule: " + err.message);
        } finally {
            setRescheduling(false);
        }
    };

    const handleCheckIn = async (app: AppointmentWithPatient) => {
        try {
            // Find next queue token number for this doctor today
            const todayStr = new Date(app.appointment_date).toISOString().split('T')[0];
            const startOfDay = `${todayStr} 00:00:00`;
            const endOfDay = `${todayStr} 23:59:59`;

            // Count existing check-ins/consultations/completed for today
            const checkInCount = appointments.filter(
                a => a.appointment_date.startsWith(todayStr) && 
                ['CHECKED_IN', 'CONSULTATION', 'COMPLETED'].includes(a.status)
            ).length;

            const nextToken = checkInCount + 1;

            const { error } = await supabase
                .from('Appointment')
                .update({
                    status: 'CHECKED_IN',
                    token_number: nextToken
                })
                .eq('id', app.id);

            if (error) throw error;
            alert(`Patient checked in. Assigned Token Queue Number: ${nextToken}`);
            await fetchAppointments();
        } catch (err: any) {
            console.error('Failed to check in patient:', err);
            alert('Failed to check in: ' + err.message);
        }
    };

    const handleStartConsultation = async (app: AppointmentWithPatient) => {
        try {
            const { error } = await supabase
                .from('Appointment')
                .update({ status: 'CONSULTATION' })
                .eq('id', app.id);

            if (error) throw error;
            alert('Consultation started. Redirecting to write prescription...');
            navigate(`/dashboard/patient/${app.patient_id}`);
        } catch (err: any) {
            console.error('Failed to start consultation:', err);
            alert('Failed to start consultation: ' + err.message);
        }
    };

    const handleCompleteConsultation = async (app: AppointmentWithPatient) => {
        try {
            const { error } = await supabase
                .from('Appointment')
                .update({ status: 'COMPLETED' })
                .eq('id', app.id);

            if (error) throw error;
            alert('Consultation completed successfully.');
            await fetchAppointments();
        } catch (err: any) {
            console.error('Failed to complete consultation:', err);
            alert('Failed to complete: ' + err.message);
        }
    };

    const handleUpdateStatus = async (id: string, status: 'Accepted' | 'CANCELLED') => {
        const { error } = await supabase
            .from('Appointment')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error(error);
            alert('Failed to update status: ' + error.message);
        } else {
            alert(`Appointment ${status.toLowerCase()} successfully.`);
            await fetchAppointments();
        }
    };

    const handleApplyLeave = async () => {
        if (!leaveStart || !leaveEnd || !leaveReason) return alert('Start, End dates and reason are required.');
        setSubmittingLeave(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('doctor_leaves')
                .insert({
                    doctor_id: user.id,
                    start_date: leaveStart,
                    end_date: leaveEnd,
                    leave_type: leaveType,
                    status: 'PENDING',
                    reason: leaveReason
                });

            if (error) throw error;

            alert('Leave request submitted successfully.');
            setShowLeaveModal(false);
            setLeaveStart('');
            setLeaveEnd('');
            setLeaveReason('');
            await fetchLeaves();
        } catch (err: any) {
            console.error('Failed to apply for leave:', err);
            alert('Failed to submit leave: ' + err.message);
        } finally {
            setSubmittingLeave(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading clinical appointments & leaves...</div>;

    return (
        <div className={styles.container}>
            {/* Top Header */}
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>{t('dashboard.doctor.appointments.title')}</h2>
                    <p className={styles.subtitle}>Check-in patient queues, manage consultations, and schedule departmental leaves.</p>
                </div>
                <button
                    onClick={() => setShowLeaveModal(true)}
                    className={styles.applyLeaveBtn}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#4f46e5' }}
                >
                    <AirplaneTakeoff size={18} /> Apply for Leave
                </button>
            </div>

            {/* Main Section split: Appointments on Left, Leaves Roster on Right */}
            <div className={styles.mainGrid} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', marginTop: '24px' }}>
                
                {/* Left Side: Appointments List */}
                <div>
                    <h3 className={styles.sectionTitle} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={20} /> Active Patient Appointments ({appointments.length})
                    </h3>
                    
                    {appointments.length === 0 ? (
                        <div className={styles.noAppointments}>
                            <h3>{t('dashboard.doctor.appointments.no_appointments')}</h3>
                        </div>
                    ) : (
                        <div className={styles.listGrid} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {appointments.map((app) => (
                                <div key={app.id} className={`${styles.card} t-card`} style={{ borderLeft: app.status === 'CHECKED_IN' ? '4px solid #3b82f6' : app.status === 'CONSULTATION' ? '4px solid #10b981' : '' }}>
                                    <div className={styles.patientInfo}>
                                        <div className={styles.avatar}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className={styles.patientName}>
                                                {app.profiles?.full_name || t('dashboard.doctor.appointments.unknown_patient')}
                                                {app.token_number && (
                                                    <span className="t-badge t-badge-info" style={{ marginLeft: '12px' }}>
                                                        Queue Token: #{app.token_number}
                                                    </span>
                                                )}
                                            </h3>
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
                                            <p className={styles.statusText}>
                                                Status: <strong className={`t-badge ${
                                                    app.status === 'COMPLETED' ? 't-badge-success' : 
                                                    app.status === 'CANCELLED' ? 't-badge-danger' : 
                                                    app.status === 'CHECKED_IN' ? 't-badge-info' : 
                                                    app.status === 'CONSULTATION' ? 't-badge-warning' : 't-badge-secondary'
                                                }`}>{app.status.toUpperCase()}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Workflows */}
                                    <div className={styles.actions} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                        {app.status === 'PENDING' && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(app.id, 'Accepted')}
                                                    className={`${styles.acceptBtn} t-btn t-btn-success`}
                                                    style={{ flex: 1 }}
                                                >
                                                    <CheckCircle size={16} /> Accept
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(app.id, 'CANCELLED')}
                                                    className={`${styles.declineBtn} t-btn t-btn-danger`}
                                                    style={{ flex: 1 }}
                                                >
                                                    <XCircle size={16} /> Decline
                                                </button>
                                            </>
                                        )}

                                        {(app.status === 'Accepted' || app.status === 'CONFIRMED') && (
                                            <>
                                                <button
                                                    onClick={() => handleCheckIn(app)}
                                                    className="t-btn t-btn-primary"
                                                    style={{ flex: 2 }}
                                                >
                                                    Check In Patient
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(app.id, 'CANCELLED')}
                                                    className="t-btn t-btn-danger"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}

                                        {app.status === 'CHECKED_IN' && (
                                            <button
                                                onClick={() => handleStartConsultation(app)}
                                                className="t-btn t-btn-warning"
                                                style={{ flex: 1 }}
                                            >
                                                Start Consultation
                                            </button>
                                        )}

                                        {app.status === 'CONSULTATION' && (
                                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                <button
                                                    onClick={() => navigate(`/dashboard/patient/${app.patient_id}`)}
                                                    className="t-btn t-btn-info"
                                                    style={{ flex: 1 }}
                                                >
                                                    Add Notes / Prescription
                                                </button>
                                                <button
                                                    onClick={() => handleCompleteConsultation(app)}
                                                    className="t-btn t-btn-success"
                                                    style={{ flex: 1 }}
                                                >
                                                    Complete Consultation
                                                </button>
                                            </div>
                                        )}

                                        {app.status !== 'CANCELLED' && app.status !== 'COMPLETED' && (
                                            <button
                                                onClick={() => handleOpenReschedule(app)}
                                                className="t-btn t-btn-secondary"
                                            >
                                                Reschedule
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side: Leaves Management List */}
                <div style={{ borderLeft: '1px solid #334155', paddingLeft: '24px' }}>
                    <h3 className={styles.sectionTitle} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AirplaneTakeoff size={20} /> My Leaves
                    </h3>

                    {leaves.length === 0 ? (
                        <div className={styles.emptyCard} style={{ textAlign: 'center', padding: '16px', border: '1px dashed #475569', borderRadius: '8px' }}>
                            <Info size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                            <p style={{ fontSize: '13px', color: '#94a3b8' }}>No leaves requested yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {leaves.map((leave) => (
                                <div key={leave.id} className="t-card" style={{ padding: '12px', fontSize: '13px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ color: '#e2e8f0' }}>{leave.leave_type}</strong>
                                        <span className={`t-badge ${leave.status === 'APPROVED' ? 't-badge-success' : leave.status === 'REJECTED' ? 't-badge-danger' : 't-badge-secondary'}`}>
                                            {leave.status}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '8px', color: '#94a3b8' }}>
                                        <p>Start: {new Date(leave.start_date).toLocaleDateString()}</p>
                                        <p>End: {new Date(leave.end_date).toLocaleDateString()}</p>
                                        {leave.reason && <p style={{ fontStyle: 'italic', marginTop: '4px' }}>"{leave.reason}"</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Reschedule Modal */}
            {rescheduleAppointment && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Reschedule Appointment</h3>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
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
                                className="t-btn t-btn-secondary"
                                disabled={rescheduling}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveReschedule}
                                className="t-btn t-btn-primary"
                                disabled={rescheduling || !rescheduleDate}
                            >
                                {rescheduling ? "Saving..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Application Modal */}
            {showLeaveModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Apply for Leave</h3>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Leave Start Date</label>
                            <input 
                                type="date" 
                                value={leaveStart}
                                onChange={e => setLeaveStart(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Leave End Date</label>
                            <input 
                                type="date" 
                                value={leaveEnd}
                                onChange={e => setLeaveEnd(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Leave Category</label>
                            <select 
                                value={leaveType}
                                onChange={e => setLeaveType(e.target.value)}
                                className={styles.select}
                            >
                                <option value="CASUAL">Casual Leave</option>
                                <option value="SICK">Sick Leave</option>
                                <option value="VACATION">Vacation / Leave of Absence</option>
                                <option value="EMERGENCY">Emergency Leave</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Reason for Absence</label>
                            <textarea 
                                placeholder="Explain clinical replacement, emergency cover details, or reason..."
                                value={leaveReason}
                                onChange={e => setLeaveReason(e.target.value)}
                                className={styles.textarea}
                                rows={3}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button 
                                onClick={() => setShowLeaveModal(false)}
                                className="t-btn t-btn-secondary"
                                disabled={submittingLeave}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleApplyLeave}
                                className="t-btn t-btn-primary"
                                disabled={submittingLeave || !leaveStart || !leaveEnd || !leaveReason}
                            >
                                {submittingLeave ? "Submitting..." : "Apply"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}