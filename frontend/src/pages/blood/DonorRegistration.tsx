import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { UserPlus, Heart, CheckCircle, Spinner } from 'phosphor-react';
import { motion } from 'framer-motion';
import styles from './styles/DonorRegistration.module.css';

export default function DonorRegistration() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fields
    const [bloodGroup, setBloodGroup] = useState('A+');
    const [district, setDistrict] = useState('');
    const [phone, setPhone] = useState('');
    const [available, setAvailable] = useState(true);
    const [isAlreadyDonor, setIsAlreadyDonor] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from('User').select('*').eq('id', user.id).single();
        if (profile) {
            if (profile.blood_group) setBloodGroup(profile.blood_group);
            if (profile.district) setDistrict(profile.district);
            if (profile.phone) setPhone(profile.phone);
        }

        const { data: donor } = await supabase.from('blood_donors').select('*').eq('user_id', user.id).single();
        if (donor) {
            setIsAlreadyDonor(true);
            setAvailable(donor.availability);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('User').update({
                blood_group: bloodGroup,
                district: district,
                phone: phone
            }).eq('id', user.id);

            const donorData = { user_id: user.id, availability: available };
            if (isAlreadyDonor) {
                await supabase.from('blood_donors').update(donorData).eq('user_id', user.id);
            } else {
                await supabase.from('blood_donors').insert(donorData);
            }
            alert(t('blood.register.success'));
        } catch (err) {
            console.error(err);
            alert(t('blood.register.fail'));
        } finally {
            setSaving(false);
        }
    };

    const handleUnregister = async () => {
        if (!confirm("Are you sure you want to unregister as a blood donor? You will no longer appear in search results for blood requests.")) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('blood_donors')
                .delete()
                .eq('user_id', user.id);

            if (error) throw error;

            alert("Successfully unregistered as a blood donor.");
            setIsAlreadyDonor(false);
            setAvailable(false);
        } catch (err: any) {
            console.error(err);
            alert("Failed to unregister: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className={styles.loadingWrapper}>
            <Spinner size={32} className={styles.spinner} />
        </div>
    );

    return (
        <div className={styles.container}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${styles.card} t-card-glass`}
            >
                <div className={styles.header}>
                    <div className={styles.iconCircle}>
                        <UserPlus size={32} />
                    </div>
                    <h2 className={styles.title}>
                        {isAlreadyDonor ? t('blood.register.title_update') : t('blood.register.title_register')}
                    </h2>
                    <p className={styles.subtitle}>
                        {t('blood.register.subtitle', 'Join our hero community and save lives.')}
                    </p>
                </div>

                <form onSubmit={handleSave} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('blood.request.group_label')}</label>
                        <select
                            value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}
                            className={styles.select}
                        >
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('blood.search.district_label')}</label>
                        <input
                            type="text" required value={district} onChange={(e) => setDistrict(e.target.value)}
                            className={styles.input}
                            placeholder="e.g. Dhaka"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('blood.register.phone_label')}</label>
                        <input
                            type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                            className={styles.input}
                            placeholder="+880..."
                        />
                    </div>

                    <div className={`${styles.checkboxGroup} ${available ? styles.checkActive : ''}`}>
                        <input
                            type="checkbox"
                            className={styles.hiddenCheck}
                            id="availability"
                            checked={available}
                            onChange={(e) => setAvailable(e.target.checked)}
                        />
                        <label htmlFor="availability" className={styles.checkLabel}>
                            <div className={styles.checkIcon}>
                                <Heart weight={available ? "fill" : "regular"} />
                            </div>
                            <div className={styles.checkText}>
                                <span className={styles.checkTitle}>{t('blood.register.available_label')}</span>
                                <span className={styles.checkDesc}>
                                    {available ? 'You are visible in search results' : 'You are currently hidden'}
                                </span>
                            </div>
                            <div className={styles.checkToggle}>
                                <div className={styles.toggleKnob} />
                            </div>
                        </label>
                    </div>

                    <div className={styles.btnRow}>
                        <button type="submit" disabled={saving} className={`${styles.submitBtn} t-btn-primary`}>
                            {saving ? (
                                <Spinner size={20} className={styles.spinner} />
                            ) : (
                                <>
                                    <CheckCircle size={20} weight="bold" />
                                    {isAlreadyDonor ? t('blood.register.update_btn') : t('blood.register.register_btn')}
                                </>
                            )}
                        </button>
                        {isAlreadyDonor && (
                            <button
                                type="button"
                                onClick={handleUnregister}
                                disabled={saving}
                                className={styles.unregisterBtn}
                            >
                                Leave Community
                            </button>
                        )}
                    </div>
                </form>
            </motion.div>
        </div>
    );
}