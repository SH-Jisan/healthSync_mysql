import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    User, Phone, Briefcase, GraduationCap, CurrencyDollar, FloppyDisk,
    IdentificationCard, ShieldCheck, MapPin, Heartbeat, FirstAid, FileText
} from 'phosphor-react';
import styles from './EditProfile.module.css';

export default function EditProfile() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [role, setRole] = useState('CITIZEN');

    // Common Fields
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [district, setDistrict] = useState('');
    const [address, setAddress] = useState('');

    // Citizen Specific Fields
    const [nationalId, setNationalId] = useState('');
    const [birthRegNumber, setBirthRegNumber] = useState('');
    const [passportNumber, setPassportNumber] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [allergies, setAllergies] = useState('');
    const [chronicDiseases, setChronicDiseases] = useState('');
    const [vaccinationHistory, setVaccinationHistory] = useState('');
    const [insuranceInfo, setInsuranceInfo] = useState('');
    const [organDonorStatus, setOrganDonorStatus] = useState('NONE');
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

    // Doctor Specific Fields
    const [specialty, setSpecialty] = useState('');
    const [degree, setDegree] = useState('');
    const [experience, setExperience] = useState('');
    const [consultationFee, setConsultationFee] = useState('');
    const [about, setAbout] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');

    const specialties = [
        'General Medicine', 'Cardiology', 'Neurology', 'Pediatrics',
        'Dermatology', 'Orthopedics', 'Gynecology', 'Dental', 'Eye Specialist'
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase.from('User').select('*').eq('id', user.id).single();
            if (data) {
                setRole(data.role || 'CITIZEN');
                setFullName(data.full_name || '');
                setPhone(data.phone || '');
                setDistrict(data.district || '');
                setAddress(data.address || '');

                if (data.role === 'DOCTOR') {
                    setSpecialty(data.specialty || '');
                    setDegree(data.degree || '');
                    setExperience(data.experience || '');
                    setConsultationFee(data.consultation_fee || '');
                    setAbout(data.about || '');
                    setLicenseNumber(data.license_number || '');
                } else if (data.role === 'CITIZEN') {
                    setNationalId(data.national_id || '');
                    setBirthRegNumber(data.birth_reg_number || '');
                    setPassportNumber(data.passport_number || '');
                    setBloodGroup(data.blood_group || '');
                    setAllergies(data.allergies || '');
                    setChronicDiseases(data.chronic_diseases || '');
                    setVaccinationHistory(data.vaccination_history || '');
                    setInsuranceInfo(data.insurance_info || '');
                    setOrganDonorStatus(data.organ_donor_status || 'NONE');
                    setEmergencyContactName(data.emergency_contact_name || '');
                    setEmergencyContactPhone(data.emergency_contact_phone || '');
                }
            }
            setLoading(false);
        };

        fetchProfile();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updates: Record<string, any> = {
            full_name: fullName,
            phone: phone,
            district: district,
            address: address,
            updated_at: new Date().toISOString(),
        };

        if (role === 'DOCTOR') {
            updates.specialty = specialty;
            updates.degree = degree;
            updates.experience = experience;
            updates.consultation_fee = consultationFee;
            updates.about = about;
            updates.license_number = licenseNumber;
        } else if (role === 'CITIZEN') {
            updates.national_id = nationalId || null;
            updates.birth_reg_number = birthRegNumber || null;
            updates.passport_number = passportNumber || null;
            updates.blood_group = bloodGroup;
            updates.allergies = allergies;
            updates.chronic_diseases = chronicDiseases;
            updates.vaccination_history = vaccinationHistory;
            updates.insurance_info = insuranceInfo;
            updates.organ_donor_status = organDonorStatus;
            updates.emergency_contact_name = emergencyContactName;
            updates.emergency_contact_phone = emergencyContactPhone;

            const checkEmptyHealthId = await supabase.from('User').select('health_id').eq('id', user.id).single();
            if (!checkEmptyHealthId.data?.health_id) {
                updates.health_id = 'HS-' + Math.floor(10000000 + Math.random() * 90000000);
            }
        }

        const { error } = await supabase.from('User').update(updates).eq('id', user.id);

        if (error) {
            alert('Failed to update profile: ' + error.message);
        } else {
            alert('Profile updated successfully.');
            navigate('/profile');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <span>{t('profile.loading') || 'Loading Profile Editor...'}</span>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h2 className={styles.pageTitle}>{t('profile.edit')}</h2>
            </div>

            <form onSubmit={handleSave} className={styles.formCard}>
                {/* Common Account & Contact Information */}
                <div>
                    <h3 className={styles.sectionHeader}>
                        <User size={20} color="var(--primary)" /> Basic & Contact Information
                    </h3>

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('profile.fields.full_name')}</label>
                            <div className={styles.inputWrapper}>
                                <User size={18} className={styles.inputIcon} />
                                <input
                                    required
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('profile.fields.phone')}</label>
                            <div className={styles.inputWrapper}>
                                <Phone size={18} className={styles.inputIcon} />
                                <input
                                    required
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>District</label>
                            <div className={styles.inputWrapper}>
                                <MapPin size={18} className={styles.inputIcon} />
                                <input
                                    type="text"
                                    value={district}
                                    onChange={e => setDistrict(e.target.value)}
                                    className={styles.input}
                                    placeholder="e.g. Dhaka, Sylhet"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Address</label>
                            <div className={styles.inputWrapper}>
                                <MapPin size={18} className={styles.inputIcon} />
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className={styles.input}
                                    placeholder="e.g. House 24, Road 4, Banani"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Citizen Specific Credentials & Medical Profile */}
                {role === 'CITIZEN' && (
                    <>
                        <div>
                            <h3 className={styles.sectionHeader}>
                                <IdentificationCard size={20} color="var(--primary)" /> Government Credentials & Blood Details
                            </h3>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>National ID (NID)</label>
                                    <div className={styles.inputWrapper}>
                                        <IdentificationCard size={18} className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            value={nationalId}
                                            onChange={e => setNationalId(e.target.value)}
                                            className={styles.input}
                                            placeholder="Enter NID Number"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Birth Registration Number</label>
                                    <div className={styles.inputWrapper}>
                                        <FileText size={18} className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            value={birthRegNumber}
                                            onChange={e => setBirthRegNumber(e.target.value)}
                                            className={styles.input}
                                            placeholder="Enter Birth Reg Number"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Passport Number</label>
                                    <div className={styles.inputWrapper}>
                                        <FileText size={18} className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            value={passportNumber}
                                            onChange={e => setPassportNumber(e.target.value)}
                                            className={styles.input}
                                            placeholder="Enter Passport Number"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Blood Group</label>
                                    <div className={styles.inputWrapper}>
                                        <select
                                            value={bloodGroup}
                                            onChange={e => setBloodGroup(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="">Select Blood Group</option>
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
                            </div>
                        </div>

                        <div>
                            <h3 className={styles.sectionHeader}>
                                <Heartbeat size={20} color="var(--primary)" /> Clinical Medical History & Emergency Contacts
                            </h3>

                            <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Known Allergies</label>
                                    <textarea
                                        rows={2}
                                        value={allergies}
                                        onChange={e => setAllergies(e.target.value)}
                                        className={styles.textarea}
                                        placeholder="e.g. Peanuts, Penicillin, Dust..."
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Chronic Illnesses / Medical History</label>
                                    <textarea
                                        rows={2}
                                        value={chronicDiseases}
                                        onChange={e => setChronicDiseases(e.target.value)}
                                        className={styles.textarea}
                                        placeholder="e.g. Diabetes, Hypertension, Asthma..."
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Vaccination History</label>
                                    <textarea
                                        rows={2}
                                        value={vaccinationHistory}
                                        onChange={e => setVaccinationHistory(e.target.value)}
                                        className={styles.textarea}
                                        placeholder="e.g. Covid-19 Booster, Hepatitis B..."
                                    />
                                </div>
                            </div>

                            <div className={styles.formGrid} style={{ marginTop: '16px' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Insurance Policy Details</label>
                                    <div className={styles.inputWrapper}>
                                        <FileText size={18} className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            value={insuranceInfo}
                                            onChange={e => setInsuranceInfo(e.target.value)}
                                            className={styles.input}
                                            placeholder="Provider & Policy No"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Organ Donor Status</label>
                                    <div className={styles.inputWrapper}>
                                        <select
                                            value={organDonorStatus}
                                            onChange={e => setOrganDonorStatus(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="NONE">Not Registered</option>
                                            <option value="KIDNEY">Kidney Donor</option>
                                            <option value="CORNEA">Cornea Donor</option>
                                            <option value="HEART">Heart/Lungs Donor</option>
                                            <option value="ALL_ORGANS">Full Organ Donor</option>
                                        </select>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Emergency Contact Name</label>
                                    <div className={styles.inputWrapper}>
                                        <User size={18} className={styles.inputIcon} />
                                        <input
                                            type="text"
                                            value={emergencyContactName}
                                            onChange={e => setEmergencyContactName(e.target.value)}
                                            className={styles.input}
                                            placeholder="Relative / Friend Name"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Emergency Contact Phone</label>
                                    <div className={styles.inputWrapper}>
                                        <Phone size={18} className={styles.inputIcon} />
                                        <input
                                            type="tel"
                                            value={emergencyContactPhone}
                                            onChange={e => setEmergencyContactPhone(e.target.value)}
                                            className={styles.input}
                                            placeholder="Phone Number"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Doctor Specific Info */}
                {role === 'DOCTOR' && (
                    <div>
                        <h3 className={styles.sectionHeader}>
                            <Briefcase size={20} color="var(--primary)" /> Professional Medical Credentials
                        </h3>

                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Medical License Number</label>
                                <div className={styles.inputWrapper}>
                                    <ShieldCheck size={18} className={styles.inputIcon} />
                                    <input
                                        type="text"
                                        value={licenseNumber}
                                        onChange={e => setLicenseNumber(e.target.value)}
                                        className={styles.input}
                                        placeholder="BMDC License No"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Specialty</label>
                                <div className={styles.inputWrapper}>
                                    <Briefcase size={18} className={styles.inputIcon} />
                                    <select
                                        value={specialty}
                                        onChange={e => setSpecialty(e.target.value)}
                                        className={styles.select}
                                    >
                                        <option value="">Select Specialty</option>
                                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Degrees & Qualification</label>
                                <div className={styles.inputWrapper}>
                                    <GraduationCap size={18} className={styles.inputIcon} />
                                    <input
                                        type="text"
                                        value={degree}
                                        onChange={e => setDegree(e.target.value)}
                                        className={styles.input}
                                        placeholder="e.g. MBBS, FCPS"
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Consultation Fee (৳)</label>
                                <div className={styles.inputWrapper}>
                                    <CurrencyDollar size={18} className={styles.inputIcon} />
                                    <input
                                        type="number"
                                        value={consultationFee}
                                        onChange={e => setConsultationFee(e.target.value)}
                                        className={styles.input}
                                        placeholder="e.g. 1000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                            <label className={styles.label}>About Doctor (Bio)</label>
                            <textarea
                                rows={3}
                                value={about}
                                onChange={e => setAbout(e.target.value)}
                                className={styles.textarea}
                                placeholder="Write a brief professional summary..."
                            />
                        </div>
                    </div>
                )}

                {/* Form Action Buttons */}
                <div className={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className={styles.cancelBtn}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className={styles.saveBtn}
                    >
                        {saving ? t('common.processing') : <><FloppyDisk size={18} /> {t('common.save')}</>}
                    </button>
                </div>
            </form>
        </div>
    );
}