import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { User, Phone, Briefcase, GraduationCap, CurrencyDollar, FloppyDisk } from 'phosphor-react';
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

    // Doctor Specific Fields
    const [specialty, setSpecialty] = useState('');
    const [degree, setDegree] = useState('');
    const [experience, setExperience] = useState('');
    const [consultationFee, setConsultationFee] = useState('');
    const [about, setAbout] = useState('');

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

                if (data.role === 'DOCTOR') {
                    setSpecialty(data.specialty || '');
                    setDegree(data.degree || '');
                    setExperience(data.experience || '');
                    setConsultationFee(data.consultation_fee || '');
                    setAbout(data.about || '');
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

        const updates: Record<string, string | null | undefined> = {
            full_name: fullName,
            phone: phone,
            updated_at: new Date().toISOString(),
        };

        if (role === 'DOCTOR') {
            updates.specialty = specialty;
            updates.degree = degree;
            updates.experience = experience;
            updates.consultation_fee = consultationFee;
            updates.about = about;
        }

        const { error } = await supabase.from('User').update(updates).eq('id', user.id);

        if (error) {
            alert(t('profile.update_error'));
        } else {
            alert(t('profile.update_success'));
            navigate('/profile');
        }
        setSaving(false);
    };

    if (loading) return <div className={styles.loading}>{t('profile.loading')}</div>;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>{t('profile.edit')}</h2>

            <form onSubmit={handleSave} className={styles.formCard}>

                {/* Common Info */}
                <h3 className={styles.sectionHeader}>{t('profile.basic_info')}</h3>

                <div className={styles.formGroup}>
                    <label className={styles.label}>{t('profile.fields.full_name')}</label>
                    <div className={styles.inputWrapper}>
                        <User size={20} color="var(--text-secondary)" />
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
                        <Phone size={20} color="var(--text-secondary)" />
                        <input
                            required
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                </div>

                {/* Doctor Specific Info */}
                {role === 'DOCTOR' && (
                    <>
                        <h3 className={`${styles.sectionHeader} ${styles.doctorSection}`}>
                            {t('profile.professional_details')}
                        </h3>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('profile.fields.specialty')}</label>
                            <div className={styles.inputWrapper}>
                                <Briefcase size={20} color="var(--text-secondary)" />
                                <select
                                    value={specialty}
                                    onChange={e => setSpecialty(e.target.value)}
                                    className={styles.input}
                                >
                                    <option value="">{t('profile.select_specialty')}</option>
                                    {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('profile.degree')}</label>
                            <div className={styles.inputWrapper}>
                                <GraduationCap size={20} color="var(--text-secondary)" />
                                <input
                                    type="text"
                                    value={degree}
                                    onChange={e => setDegree(e.target.value)}
                                    className={styles.input}
                                    placeholder={t('profile.degree_placeholder')}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('profile.experience')}</label>
                            <div className={styles.inputWrapper}>
                                <input
                                    type="number"
                                    value={experience}
                                    onChange={e => setExperience(e.target.value)}
                                    className={styles.input}
                                    placeholder={t('profile.experience_placeholder')}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('profile.fee_label')}</label>
                            <div className={styles.inputWrapper}>
                                <CurrencyDollar size={20} color="var(--text-secondary)" />
                                <input
                                    type="number"
                                    value={consultationFee}
                                    onChange={e => setConsultationFee(e.target.value)}
                                    className={styles.input}
                                    placeholder={t('profile.fee_placeholder')}
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('profile.about_label')}</label>
                            <textarea
                                rows={3}
                                value={about}
                                onChange={e => setAbout(e.target.value)}
                                className={styles.textarea}
                                placeholder={t('profile.about_placeholder')}
                            />
                        </div>
                    </>
                )}

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
                        {saving ? t('common.processing') : <><FloppyDisk size={20} /> {t('common.save')}</>}
                    </button>
                </div>

            </form>
        </div>
    );
}