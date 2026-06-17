import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { 
    User, 
    UserPlus, 
    ArrowRight, 
    UploadSimple, 
    Activity, 
    Plus, 
    X, 
    Heartbeat, 
    Thermometer, 
    Drop, 
    Eye,
    PlusCircle,
    CheckCircle,
    Trash
} from 'phosphor-react';
import styles from './styles/DoctorMyPatients.module.css';

interface Patient {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
}

interface DoctorPatientRow {
    id: string; // ID of the relationship row
    patient_id: string;
    profiles: Patient; // Joined data
}

export default function DoctorMyPatients() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    // Core States
    const [patients, setPatients] = useState<DoctorPatientRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Tabs Selection ('link' vs 'create')
    const [activeTab, setActiveTab] = useState<'link' | 'create'>('link');

    // Tab 1: Link Existing Patient States
    const [searchEmail, setSearchEmail] = useState('');

    // Tab 2: Create New Patient States
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newGender, setNewGender] = useState('Male');
    const [newBloodGroup, setNewBloodGroup] = useState('');
    const [newDistrict, setNewDistrict] = useState('');
    const [newAddress, setNewAddress] = useState('');
    
    // Avatar upload
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Vitals sub-fields
    const [vitalsBp, setVitalsBp] = useState('');
    const [vitalsHr, setVitalsHr] = useState('');
    const [vitalsTemp, setVitalsTemp] = useState('');
    const [vitalsWeight, setVitalsWeight] = useState('');

    // Medical history initial record sub-fields
    const [historyTitle, setHistoryTitle] = useState('');
    const [historyType, setHistoryType] = useState<'REPORT' | 'PRESCRIPTION' | 'VACCINATION' | 'TEST_ORDER'>('REPORT');
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
    const [historySeverity, setHistorySeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
    const [historySummary, setHistorySummary] = useState('');
    const [historyFile, setHistoryFile] = useState<File | null>(null);

    // Form errors
    const [formError, setFormError] = useState<string | null>(null);

    const fetchPatients = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('doctor_patients')
            .select('id, patient_id, profiles:patient_id(id, full_name, email, phone)')
            .eq('doctor_id', user.id);

        if (!error && data) {
            setPatients(data as unknown as DoctorPatientRow[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const handleRemovePatient = async (rowId: string, patientName: string) => {
        if (!confirm(`Are you sure you want to remove ${patientName} from your patients list?`)) return;
        try {
            const { error } = await supabase
                .from('doctor_patients')
                .delete()
                .eq('id', rowId);

            if (error) throw error;
            alert("Patient removed successfully.");
            fetchPatients();
        } catch (err: any) {
            console.error(err);
            alert("Failed to remove patient: " + err.message);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleHistoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setHistoryFile(file);
        }
    };

    // Tab 1: Link Existing Patient
    const handleLinkPatient = async () => {
        if (!searchEmail) {
            setFormError(t('dashboard.doctor.patients.email_placeholder', 'Please enter a valid email.'));
            return;
        }

        setSubmitting(true);
        setFormError(null);

        try {
            // 1. Find User profile by email
            const { data: profile, error: searchError } = await supabase
                .from('User')
                .select('id, role')
                .eq('email', searchEmail.trim())
                .maybeSingle();

            if (searchError || !profile) {
                setFormError(t('dashboard.doctor.alerts.user_not_found', 'No patient found with this email.'));
                setSubmitting(false);
                return;
            }

            if (profile.role !== 'CITIZEN') {
                setFormError('Only users registered with the Citizen role can be added as patients.');
                setSubmitting(false);
                return;
            }

            // 2. Check if already linked
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: existingLink } = await supabase
                .from('doctor_patients')
                .select('id')
                .eq('doctor_id', user.id)
                .eq('patient_id', profile.id)
                .maybeSingle();

            if (existingLink) {
                setFormError(t('dashboard.doctor.alerts.patient_exists', 'This patient is already linked to your profile.'));
                setSubmitting(false);
                return;
            }

            // 3. Insert Relationship row
            const { error: insertError } = await supabase.from('doctor_patients').insert({
                doctor_id: user.id,
                patient_id: profile.id
            });

            if (insertError) {
                setFormError(t('dashboard.doctor.alerts.add_failed', 'Failed to link patient relationship.'));
            } else {
                alert(t('dashboard.doctor.alerts.add_success', 'Patient linked successfully!'));
                setShowAddModal(false);
                resetForm();
                await fetchPatients();
            }
        } catch (err: any) {
            setFormError(err.message || 'An error occurred during linking.');
        } finally {
            setSubmitting(false);
        }
    };

    // Tab 2: Create New Patient Profile & Link
    const handleCreatePatient = async () => {
        // Validation
        if (!newName.trim()) {
            setFormError('Name is required.');
            return;
        }
        if (!newEmail.trim() || !newEmail.includes('@')) {
            setFormError('A valid email address is required.');
            return;
        }
        if (!newGender) {
            setFormError('Gender is required.');
            return;
        }

        setSubmitting(true);
        setFormError(null);

        try {
            // 1. Check if email is already in use
            const { data: existingProfile } = await supabase
                .from('User')
                .select('id')
                .eq('email', newEmail.trim())
                .maybeSingle();

            if (existingProfile) {
                setFormError('A profile with this email already exists. Please use the "Link Existing Patient" tab.');
                setSubmitting(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Generate UUID for new patient
            const patientId = window.crypto?.randomUUID 
                ? window.crypto.randomUUID() 
                : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            // 2. Upload Avatar Image if selected
            let avatarUrl = '';
            if (avatarFile) {
                const extension = avatarFile.name.split('.').pop();
                const fileName = `avatars/${patientId}_${Date.now()}.${extension}`;
                const { error: uploadError } = await supabase.storage.from('reports').upload(fileName, avatarFile);
                if (!uploadError) {
                    avatarUrl = fileName;
                } else {
                    console.error('Avatar upload failed:', uploadError);
                }
            }

            // 3. Create Patient Profile
            const { error: createError } = await supabase.from('User').insert({
                id: patientId,
                email: newEmail.trim().toLowerCase(),
                password_hash: '$2a$10$0p2W.eH5XGZ3G28hB3tSDeqU7Y2H6N.yXy6O8.e8.05v8a8a8a8a8', // seeded default password hash
                full_name: newName.trim(),
                phone: newPhone.trim() || null,
                role: 'CITIZEN',
                blood_group: newBloodGroup || null,
                gender: newGender,
                district: newDistrict.trim() || null,
                address: newAddress.trim() || null,
                avatar_url: avatarUrl || null
            });

            if (createError) {
                setFormError(`Failed to create patient profile: ${createError.message}`);
                setSubmitting(false);
                return;
            }

            // 4. Link relationship
            const { error: linkError } = await supabase.from('doctor_patients').insert({
                doctor_id: user.id,
                patient_id: patientId
            });

            if (linkError) {
                setFormError(`Profile created, but failed to link relationship: ${linkError.message}`);
                setSubmitting(false);
                return;
            }

            // 5. Create Initial Medical Vitals / History Event if specified
            const hasHistory = historyTitle.trim() !== '';
            const hasVitals = vitalsBp || vitalsHr || vitalsTemp || vitalsWeight;

            if (hasHistory || hasVitals) {
                let attachmentUrl = '';
                if (historyFile) {
                    const extension = historyFile.name.split('.').pop();
                    const fileName = `records/${patientId}_${Date.now()}.${extension}`;
                    const { error: fileUploadError } = await supabase.storage.from('reports').upload(fileName, historyFile);
                    if (!fileUploadError) {
                        attachmentUrl = fileName;
                    } else {
                        console.error('Record attachment upload failed:', fileUploadError);
                    }
                }

                const eventId = window.crypto?.randomUUID 
                    ? window.crypto.randomUUID() 
                    : Math.random().toString(36).substring(2, 15);

                const { error: eventError } = await supabase.from('medical_events').insert({
                    id: eventId,
                    patient_id: patientId,
                    uploader_id: user.id,
                    title: historyTitle.trim() || 'Initial Medical Intake Vitals',
                    event_type: historyType || 'REPORT',
                    event_date: historyDate || new Date().toISOString().split('T')[0],
                    severity: historySeverity || 'LOW',
                    summary: historySummary.trim() || 'Record registered during patient addition by attending doctor.',
                    vitals: hasVitals ? {
                        bp: vitalsBp || undefined,
                        hr: vitalsHr || undefined,
                        temp: vitalsTemp || undefined,
                        weight: vitalsWeight || undefined
                    } : null,
                    attachment_urls: attachmentUrl ? [attachmentUrl] : []
                });

                if (eventError) {
                    console.error('Vitals / History insertion error:', eventError);
                }
            }

            alert('Patient profile created and linked successfully!');
            setShowAddModal(false);
            resetForm();
            await fetchPatients();

        } catch (err: any) {
            setFormError(err.message || 'An error occurred during patient creation.');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSearchEmail('');
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        setNewGender('Male');
        setNewBloodGroup('');
        setNewDistrict('');
        setNewAddress('');
        setAvatarFile(null);
        setAvatarPreview(null);
        setVitalsBp('');
        setVitalsHr('');
        setVitalsTemp('');
        setVitalsWeight('');
        setHistoryTitle('');
        setHistoryType('REPORT');
        setHistoryDate(new Date().toISOString().split('T')[0]);
        setHistorySeverity('LOW');
        setHistorySummary('');
        setHistoryFile(null);
        setFormError(null);
    };

    if (loading) return <div className={styles.loaderContainer}><div className={styles.spinner}></div></div>;

    return (
        <div>
            <div className={styles.header}>
                <h2 className={styles.title}>{t('dashboard.doctor.patients.title')}</h2>
                <button
                    onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                    }}
                    className={styles.addBtn}
                >
                    <UserPlus size={20} /> {t('dashboard.doctor.patients.add_btn')}
                </button>
            </div>

            {patients.length === 0 ? (
                <div className={styles.noPatients}>
                    {t('dashboard.doctor.patients.no_patients')}
                </div>
            ) : (
                <div className={styles.listGrid}>
                    {patients.map((row) => (
                        <div key={row.id} className={styles.card}>
                            <div className={styles.patientInfo}>
                                <div className={styles.avatar}>
                                    <User size={24} />
                                </div>
                                <div>
                                    <h4 className={styles.patientName}>{row.profiles?.full_name || t('dashboard.doctor.alerts.unknown')}</h4>
                                    <p className={styles.contactInfo}>{row.profiles?.phone || row.profiles?.email}</p>
                                </div>
                            </div>

                            <div className={styles.cardActions}>
                                <button
                                    onClick={() => navigate(`/dashboard/patient/${row.patient_id}`)}
                                    className={styles.viewProfileBtn}
                                >
                                    {t('dashboard.doctor.patients.view_profile')} <ArrowRight />
                                </button>
                                <button
                                    onClick={() => handleRemovePatient(row.id, row.profiles?.full_name)}
                                    className={styles.removeBtn}
                                    title="Remove Patient"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Add Treatment Patient</h3>
                            <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs Switcher */}
                        <div className={styles.tabsHeader}>
                            <button 
                                onClick={() => {
                                    setActiveTab('link');
                                    setFormError(null);
                                }}
                                className={`${styles.tabToggle} ${activeTab === 'link' ? styles.activeTabToggle : ''}`}
                            >
                                Link Existing
                            </button>
                            <button 
                                onClick={() => {
                                    setActiveTab('create');
                                    setFormError(null);
                                }}
                                className={`${styles.tabToggle} ${activeTab === 'create' ? styles.activeTabToggle : ''}`}
                            >
                                Create New Patient
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {formError && (
                                <div className={styles.errorBanner}>
                                    <span>{formError}</span>
                                </div>
                            )}

                            {activeTab === 'link' ? (
                                <div className={styles.formSection}>
                                    <p className={styles.modalDesc}>
                                        Link a patient who is already registered on HealthSync using their account email.
                                    </p>
                                    <div className={styles.inputGroup}>
                                        <label>Patient Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="patient@example.com"
                                            value={searchEmail} 
                                            onChange={e => setSearchEmail(e.target.value)}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div className={styles.modalActions}>
                                        <button onClick={() => setShowAddModal(false)} className={styles.cancelBtn} disabled={submitting}>
                                            {t('common.cancel')}
                                        </button>
                                        <button onClick={handleLinkPatient} className={styles.saveBtn} disabled={submitting}>
                                            {submitting ? 'Linking...' : 'Link Patient'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.formSection}>
                                    {/* Patient Profile Form fields */}
                                    <div className={styles.formGrid}>
                                        {/* Left col: Image Upload */}
                                        <div className={styles.avatarUploadContainer}>
                                            <div className={styles.avatarPreviewBox}>
                                                {avatarPreview ? (
                                                    <img src={avatarPreview} alt="Preview" className={styles.avatarPreviewImg} />
                                                ) : (
                                                    <User size={40} className={styles.avatarPlaceholderIcon} />
                                                )}
                                            </div>
                                            <label className={styles.fileInputLabel}>
                                                <UploadSimple size={16} />
                                                <span>Upload Photo</span>
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={handleAvatarChange} 
                                                    className={styles.hiddenFileInput} 
                                                />
                                            </label>
                                        </div>

                                        {/* Right col: Name, Email, Phone */}
                                        <div className={styles.gridFields}>
                                            <div className={styles.inputGroup}>
                                                <label>Full Name *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Enter full name"
                                                    value={newName} 
                                                    onChange={e => setNewName(e.target.value)} 
                                                    className={styles.input}
                                                />
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label>Email Address *</label>
                                                <input 
                                                    type="email" 
                                                    placeholder="patient@example.com"
                                                    value={newEmail} 
                                                    onChange={e => setNewEmail(e.target.value)} 
                                                    className={styles.input}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.formRow3}>
                                        <div className={styles.inputGroup}>
                                            <label>Phone Number</label>
                                            <input 
                                                type="text" 
                                                placeholder="+88017..."
                                                value={newPhone} 
                                                onChange={e => setNewPhone(e.target.value)} 
                                                className={styles.input}
                                            />
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label>Gender *</label>
                                            <select 
                                                value={newGender} 
                                                onChange={e => setNewGender(e.target.value)}
                                                className={styles.select}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label>Blood Group</label>
                                            <select 
                                                value={newBloodGroup} 
                                                onChange={e => setNewBloodGroup(e.target.value)}
                                                className={styles.select}
                                            >
                                                <option value="">Select Group</option>
                                                <option value="A+">A+</option>
                                                <option value="A-">A-</option>
                                                <option value="B+">B+</option>
                                                <option value="B-">B-</option>
                                                <option value="O+">O+</option>
                                                <option value="O-">O-</option>
                                                <option value="AB+">AB+</option>
                                                <option value="AB-">AB-</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.formRow2}>
                                        <div className={styles.inputGroup}>
                                            <label>District</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Dhaka"
                                                value={newDistrict} 
                                                onChange={e => setNewDistrict(e.target.value)} 
                                                className={styles.input}
                                            />
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label>Home Address</label>
                                            <input 
                                                type="text" 
                                                placeholder="Street address, house, apartment"
                                                value={newAddress} 
                                                onChange={e => setNewAddress(e.target.value)} 
                                                className={styles.input}
                                            />
                                        </div>
                                    </div>

                                    {/* Optional Vitals Subform */}
                                    <div className={styles.collapsibleSection}>
                                        <div className={styles.sectionHeader}>
                                            <Activity size={18} />
                                            <h4>Patient Intake Vitals (Optional)</h4>
                                        </div>
                                        <div className={styles.formRow4}>
                                            <div className={styles.inputGroup}>
                                                <label>BP (mmHg)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="120/80" 
                                                    value={vitalsBp} 
                                                    onChange={e => setVitalsBp(e.target.value)} 
                                                    className={styles.input}
                                                />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label>HR (bpm)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="72" 
                                                    value={vitalsHr} 
                                                    onChange={e => setVitalsHr(e.target.value)} 
                                                    className={styles.input}
                                                />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label>Temp (°F)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="98.6" 
                                                    value={vitalsTemp} 
                                                    onChange={e => setVitalsTemp(e.target.value)} 
                                                    className={styles.input}
                                                />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label>Weight (kg)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="70" 
                                                    value={vitalsWeight} 
                                                    onChange={e => setVitalsWeight(e.target.value)} 
                                                    className={styles.input}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Optional Medical Intake Record */}
                                    <div className={styles.collapsibleSection}>
                                        <div className={styles.sectionHeader}>
                                            <PlusCircle size={18} />
                                            <h4>Initial Medical Event / History Record (Optional)</h4>
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Record Title</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. Chronic Hypertension Intake" 
                                                value={historyTitle} 
                                                onChange={e => setHistoryTitle(e.target.value)} 
                                                className={styles.input}
                                            />
                                        </div>
                                        <div className={styles.formRow3}>
                                            <div className={styles.inputGroup}>
                                                <label>Record Type</label>
                                                <select 
                                                    value={historyType} 
                                                    onChange={e => setHistoryType(e.target.value as any)}
                                                    className={styles.select}
                                                >
                                                    <option value="REPORT">Diagnostic Report</option>
                                                    <option value="PRESCRIPTION">Prescription</option>
                                                    <option value="VACCINATION">Vaccination</option>
                                                    <option value="TEST_ORDER">Clinical Test Order</option>
                                                </select>
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label>Record Date</label>
                                                <input 
                                                    type="date" 
                                                    value={historyDate} 
                                                    onChange={e => setHistoryDate(e.target.value)} 
                                                    className={styles.input}
                                                />
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label>Severity Level</label>
                                                <select 
                                                    value={historySeverity} 
                                                    onChange={e => setHistorySeverity(e.target.value as any)}
                                                    className={styles.select}
                                                >
                                                    <option value="LOW">Low</option>
                                                    <option value="MEDIUM">Medium</option>
                                                    <option value="HIGH">High</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label>Diagnosis Summary & Intake Notes</label>
                                            <textarea 
                                                placeholder="Enter patient diagnosis history summary, treatment comments..." 
                                                value={historySummary} 
                                                onChange={e => setHistorySummary(e.target.value)} 
                                                className={styles.textarea}
                                                rows={3}
                                            />
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label className={styles.fileLabel}>
                                                <UploadSimple size={16} />
                                                <span>{historyFile ? historyFile.name : 'Attach Medical Document (PDF, Image...)'}</span>
                                                <input 
                                                    type="file" 
                                                    onChange={handleHistoryFileChange} 
                                                    className={styles.hiddenFileInput} 
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div className={styles.modalActions}>
                                        <button onClick={() => setShowAddModal(false)} className={styles.cancelBtn} disabled={submitting}>
                                            {t('common.cancel')}
                                        </button>
                                        <button onClick={handleCreatePatient} className={styles.saveBtn} disabled={submitting}>
                                            {submitting ? 'Creating Profile...' : 'Create & Link Patient'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}