import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { User, Trash, Plus, CheckCircle, Warning, Info } from 'phosphor-react';
import styles from './styles/HospitalBeds.module.css';

interface BedRow {
    id: number;
    bed_number: string;
    bed_type: string;
    status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'RESERVED';
    patient_id?: string;
    assigned_doctor_id?: string;
    admitted_at?: string;
    patient?: {
        full_name: string;
        phone?: string;
        email?: string;
    };
    doctor?: {
        full_name: string;
    };
}

interface DropdownItem {
    id: string;
    full_name: string;
}

export default function HospitalBeds() {
    const { t } = useTranslation();
    const [beds, setBeds] = useState<BedRow[]>([]);
    const [hospitalPatients, setHospitalPatients] = useState<DropdownItem[]>([]);
    const [hospitalDoctors, setHospitalDoctors] = useState<DropdownItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedBed, setSelectedBed] = useState<BedRow | null>(null);
    const [assignPatientId, setAssignPatientId] = useState('');
    const [assignDoctorId, setAssignDoctorId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // Add bed states
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBedNumber, setNewBedNumber] = useState('');
    const [newBedType, setNewBedType] = useState('General Ward');
    const [addError, setAddError] = useState('');

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch beds
        const { data: bedsData } = await supabase
            .from('hospital_beds')
            .select('id, bed_number, bed_type, status, patient_id, assigned_doctor_id, admitted_at, patient:patient_id(full_name, phone, email), doctor:assigned_doctor_id(full_name)')
            .eq('hospital_id', user.id)
            .order('bed_number', { ascending: true });

        if (bedsData) {
            setBeds(bedsData as unknown as BedRow[]);
        }

        // 2. Fetch admitted hospital patients to populate dropdown
        const { data: patientsData } = await supabase
            .from('hospital_patients')
            .select('patient_id, profiles:patient_id(full_name)')
            .eq('hospital_id', user.id);

        if (patientsData) {
            setHospitalPatients(
                patientsData.map((p: any) => ({
                    id: p.patient_id,
                    full_name: p.profiles?.full_name || 'Unknown Patient'
                }))
            );
        }

        // 3. Fetch hospital doctors to populate dropdown
        const { data: doctorsData } = await supabase
            .from('HospitalDoctor')
            .select('doctor_id, profiles:doctor_id(full_name)')
            .eq('hospital_id', user.id);

        if (doctorsData) {
            setHospitalDoctors(
                doctorsData.map((d: any) => ({
                    id: d.doctor_id,
                    full_name: d.profiles?.full_name || 'Unknown Doctor'
                }))
            );
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenAssignModal = (bed: BedRow) => {
        setSelectedBed(bed);
        setShowAssignModal(true);
        setAssignPatientId('');
        setAssignDoctorId('');
    };

    const handleAssignBed = async () => {
        if (!selectedBed || !assignPatientId || !assignDoctorId) return;
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('hospital_beds')
                .update({
                    status: 'OCCUPIED',
                    patient_id: assignPatientId,
                    assigned_doctor_id: assignDoctorId,
                    admitted_at: new Date().toISOString()
                })
                .eq('id', selectedBed.id);

            if (error) throw error;

            alert('Bed successfully allocated.');
            setShowAssignModal(false);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to allocate bed:', err);
            alert('Failed to allocate bed: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReleaseBed = async (bed: BedRow) => {
        if (!confirm(`Are you sure you want to release bed ${bed.bed_number}? It will be marked for cleaning.`)) return;

        try {
            const { error } = await supabase
                .from('hospital_beds')
                .update({
                    status: 'CLEANING',
                    patient_id: null,
                    assigned_doctor_id: null,
                    admitted_at: null
                })
                .eq('id', bed.id);

            if (error) throw error;

            alert('Patient discharged. Bed has been placed in CLEANING status.');
            await fetchData();
        } catch (err: any) {
            console.error('Failed to release bed:', err);
            alert('Failed to release bed: ' + err.message);
        }
    };

    const handleUpdateBedStatus = async (bedId: number, status: 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE' | 'RESERVED') => {
        try {
            const { error } = await supabase
                .from('hospital_beds')
                .update({ status })
                .eq('id', bedId);

            if (error) throw error;
            await fetchData();
        } catch (err: any) {
            console.error('Failed to update bed status:', err);
            alert('Failed to update bed status: ' + err.message);
        }
    };

    const handleCreateBed = async () => {
        if (!newBedNumber.trim() || !newBedType) {
            setAddError('Bed number and type are required.');
            return;
        }

        const bedExists = beds.some(b => b.bed_number.toLowerCase() === newBedNumber.trim().toLowerCase());
        if (bedExists) {
            setAddError(`Bed number ${newBedNumber} already exists.`);
            return;
        }

        setSubmitting(true);
        setAddError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('hospital_beds')
                .insert({
                    hospital_id: user.id,
                    bed_number: newBedNumber.trim(),
                    bed_type: newBedType,
                    status: 'AVAILABLE'
                });

            if (error) throw error;

            alert('New bed added successfully.');
            setShowAddModal(false);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to create bed:', err);
            setAddError('Failed to create bed: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteBed = async (bed: BedRow) => {
        if (bed.status === 'OCCUPIED') {
            alert('This bed is currently occupied. Please discharge the patient before deleting this bed.');
            return;
        }

        if (!confirm(`Are you sure you want to permanently delete bed ${bed.bed_number}?`)) return;

        try {
            const { error } = await supabase
                .from('hospital_beds')
                .delete()
                .eq('id', bed.id);

            if (error) throw error;

            alert('Bed deleted successfully.');
            await fetchData();
        } catch (err: any) {
            console.error('Failed to delete bed:', err);
            alert('Failed to delete bed: ' + err.message);
        }
    };

    if (loading) return <div className={styles.loading}>Loading beds configuration...</div>;

    const totalBeds = beds.length;
    const occupiedBeds = beds.filter(b => b.status === 'OCCUPIED').length;
    const availableBeds = beds.filter(b => b.status === 'AVAILABLE').length;
    const cleaningBeds = beds.filter(b => b.status === 'CLEANING').length;
    const maintenanceBeds = beds.filter(b => b.status === 'MAINTENANCE').length;

    return (
        <div className={styles.container}>
            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div className={`${styles.statCard} t-card`}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Total Beds</span>
                    </div>
                    <span className={styles.statVal}>{totalBeds}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statOccupied} t-card`}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Occupied Beds</span>
                    </div>
                    <span className={styles.statVal}>{occupiedBeds}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statAvailable} t-card`}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Available Beds</span>
                    </div>
                    <span className={styles.statVal}>{availableBeds}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statCleaning} t-card`} style={{ borderLeft: '4px solid #3b82f6' }}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Cleaning</span>
                    </div>
                    <span className={styles.statVal} style={{ color: '#3b82f6' }}>{cleaningBeds}</span>
                </div>
                <div className={`${styles.statCard} ${styles.statMaintenance} t-card`} style={{ borderLeft: '4px solid #f97316' }}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Maintenance</span>
                    </div>
                    <span className={styles.statVal} style={{ color: '#f97316' }}>{maintenanceBeds}</span>
                </div>
            </div>

            {/* Header section */}
            <div className={styles.header}>
                <h2 className={styles.title}>Bed Allocation & Ward Status</h2>
                <button
                    onClick={() => {
                        setNewBedNumber('');
                        setNewBedType('General Ward');
                        setAddError('');
                        setShowAddModal(true);
                    }}
                    className={styles.addBedBtn}
                >
                    <Plus size={16} /> Add Bed
                </button>
            </div>

            {beds.length === 0 ? (
                <div className={styles.emptyState}>
                    <Info size={48} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>No beds initialized in database schema. Run seed migrations.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {beds.map(bed => (
                        <div key={bed.id} className={`${styles.bedCard} t-card ${bed.status === 'OCCUPIED' ? styles.occupiedCard : ''}`}>
                            <div className={styles.cardHeader}>
                                <div className={styles.bedTitleWrapper}>
                                    <span className={styles.bedNumber}>{bed.bed_number}</span>
                                    <span className={`${styles.bedBadge} t-badge t-badge-info`}>{bed.bed_type}</span>
                                </div>
                                <div className={styles.headerActions}>
                                    <span className={`t-badge ${
                                        bed.status === 'OCCUPIED' ? 't-badge-danger' : 
                                        bed.status === 'AVAILABLE' ? 't-badge-success' : 
                                        bed.status === 'CLEANING' ? 't-badge-info' : 
                                        bed.status === 'MAINTENANCE' ? 't-badge-warning' : 't-badge-secondary'
                                    }`}>
                                        {bed.status.toUpperCase()}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteBed(bed)}
                                        className={styles.deleteBedBtn}
                                        title="Delete Bed"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>

                            {bed.status === 'OCCUPIED' && (
                                <div className={styles.occupiedInfo}>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Patient:</span>
                                        <span className={styles.infoVal}>{bed.patient?.full_name || 'N/A'}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Assigned Doctor:</span>
                                        <span className={styles.infoVal}>{bed.doctor?.full_name || 'N/A'}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>Admitted:</span>
                                        <span className={styles.infoVal}>
                                            {bed.admitted_at ? new Date(bed.admitted_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleReleaseBed(bed)}
                                        className={`${styles.releaseBtn} t-btn t-btn-danger`}
                                        style={{ marginTop: '12px', width: '100%' }}
                                    >
                                        Discharge Patient
                                    </button>
                                </div>
                            )}

                            {bed.status === 'AVAILABLE' && (
                                <div className={styles.availableInfo}>
                                    <p className={styles.availableText}>This bed is empty and ready for patient admission.</p>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                        <button 
                                            onClick={() => handleOpenAssignModal(bed)}
                                            className={`${styles.assignBtn} t-btn t-btn-primary`}
                                            style={{ flex: 1 }}
                                        >
                                            Allocate Bed
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateBedStatus(bed.id, 'MAINTENANCE')}
                                            className="t-btn t-btn-secondary"
                                            style={{ fontSize: '12px' }}
                                        >
                                            Maintenance
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateBedStatus(bed.id, 'CLEANING')}
                                            className="t-btn t-btn-secondary"
                                            style={{ fontSize: '12px' }}
                                        >
                                            Cleaning
                                        </button>
                                    </div>
                                </div>
                            )}

                            {bed.status === 'CLEANING' && (
                                <div className={styles.availableInfo} style={{ borderTop: '2px solid #3b82f6', paddingTop: '12px' }}>
                                    <p className={styles.availableText}>This bed is undergoing sanitization and cleaning protocols.</p>
                                    <button 
                                        onClick={() => handleUpdateBedStatus(bed.id, 'AVAILABLE')}
                                        className="t-btn t-btn-success"
                                        style={{ marginTop: '12px', width: '100%' }}
                                    >
                                        Complete Cleaning & Ready
                                    </button>
                                </div>
                            )}

                            {bed.status === 'MAINTENANCE' && (
                                <div className={styles.availableInfo} style={{ borderTop: '2px solid #f97316', paddingTop: '12px' }}>
                                    <p className={styles.availableText}>This bed is currently out-of-service for maintenance.</p>
                                    <button 
                                        onClick={() => handleUpdateBedStatus(bed.id, 'AVAILABLE')}
                                        className="t-btn t-btn-success"
                                        style={{ marginTop: '12px', width: '100%' }}
                                    >
                                        Complete Maintenance & Ready
                                    </button>
                                </div>
                            )}

                            {bed.status === 'RESERVED' && (
                                <div className={styles.availableInfo} style={{ borderTop: '2px solid #a855f7', paddingTop: '12px' }}>
                                    <p className={styles.availableText}>This bed is reserved for an incoming patient admission request.</p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <button 
                                            onClick={() => handleOpenAssignModal(bed)}
                                            className={`${styles.assignBtn} t-btn t-btn-primary`}
                                            style={{ flex: 1 }}
                                        >
                                            Allocate Bed
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateBedStatus(bed.id, 'AVAILABLE')}
                                            className="t-btn t-btn-secondary"
                                        >
                                            Release
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Assign Bed Modal */}
            {showAssignModal && selectedBed && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Allocate Bed: {selectedBed.bed_number} ({selectedBed.bed_type})</h3>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Select Admitted Patient</label>
                            <select 
                                value={assignPatientId} 
                                onChange={e => setAssignPatientId(e.target.value)}
                                className={styles.select}
                            >
                                <option value="">-- Choose Patient --</option>
                                {hospitalPatients.map(p => (
                                    <option key={p.id} value={p.id}>{p.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Assign Attendee Doctor</label>
                            <select 
                                value={assignDoctorId} 
                                onChange={e => setAssignDoctorId(e.target.value)}
                                className={styles.select}
                            >
                                <option value="">-- Choose Doctor --</option>
                                {hospitalDoctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.modalActions}>
                            <button 
                                onClick={() => setShowAssignModal(false)} 
                                className="t-btn t-btn-secondary"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleAssignBed} 
                                className="t-btn t-btn-primary"
                                disabled={submitting || !assignPatientId || !assignDoctorId}
                            >
                                {submitting ? 'Allocating...' : 'Assign Bed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Bed Modal */}
            {showAddModal && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Add New Hospital Bed</h3>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Bed Number / Identifier</label>
                            <input 
                                type="text"
                                placeholder="e.g. ICU-05, Ward-12A"
                                value={newBedNumber}
                                onChange={e => setNewBedNumber(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Bed / Ward Type</label>
                            <select 
                                value={newBedType}
                                onChange={e => setNewBedType(e.target.value)}
                                className={styles.select}
                            >
                                <option value="General Ward">General Ward</option>
                                <option value="ICU">ICU</option>
                                <option value="CCU">CCU</option>
                                <option value="Cabin">Cabin</option>
                                <option value="Emergency">Emergency</option>
                            </select>
                        </div>

                        {addError && <p className={styles.errorText}>{addError}</p>}

                        <div className={styles.modalActions}>
                            <button 
                                onClick={() => setShowAddModal(false)} 
                                className="t-btn t-btn-secondary"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateBed} 
                                className="t-btn t-btn-primary"
                                disabled={submitting || !newBedNumber.trim()}
                            >
                                {submitting ? 'Adding...' : 'Add Bed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
