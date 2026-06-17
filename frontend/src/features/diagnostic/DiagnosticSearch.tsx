import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import { MagnifyingGlass, Person } from 'phosphor-react';
import styles from './styles/DiagnosticSearch.module.css';

interface PatientProfile {
    id: string;
    full_name: string;
    email: string;
}

export default function DiagnosticSearch() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchedPatient, setSearchedPatient] = useState<PatientProfile | null>(null);

    // Registration States
    const [showRegister, setShowRegister] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');

    const handleSearch = async (e?: React.FormEvent, emailOverride?: string) => {
        e?.preventDefault();
        const searchEmail = emailOverride !== undefined ? emailOverride : email;
        if (!searchEmail) return;
        setLoading(true);
        setSearchedPatient(null);

        try {
            const { data, error } = await supabase
                .from('User')
                .select('*')
                .eq('email', searchEmail.trim())
                .eq('role', 'CITIZEN')
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setSearchedPatient(data as PatientProfile);
            } else {
                alert(t('dashboard.diagnostic.search.not_found_alert'));
                setNewEmail(searchEmail);
                setShowRegister(true);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('dashboard.diagnostic.search.search_fail');
            alert(t('common.error') + ': ' + message);
        } finally {
            setLoading(false);
        }
    };

    const assignPatient = async () => {
        if (!searchedPatient) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase.from('diagnostic_patients').insert({
                diagnostic_id: user.id,
                patient_id: searchedPatient.id
            });

            if (error) {
                if (error.code === '23505') alert(t('dashboard.diagnostic.search.already_assigned'));
                else throw error;
            } else {
                alert(t('dashboard.diagnostic.search.assign_success'));
                setSearchedPatient(null);
                setEmail('');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('dashboard.diagnostic.search.assign_fail');
            alert(t('common.error') + ': ' + message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.rpc('create_dummy_user', {
                u_email: newEmail,
                u_password: '123456',
                u_name: newName,
                u_phone: newPhone,
                u_role: 'CITIZEN',
                u_address: ''
            });

            if (error) throw error;

            alert(t('dashboard.diagnostic.search.success_reg'));
            setShowRegister(false);
            setEmail(newEmail);
            setNewName('');
            setNewEmail('');
            setNewPhone('');
            await handleSearch(undefined, newEmail);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : t('dashboard.diagnostic.search.reg_fail');
            alert(t('common.error') + ': ' + message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.searchBar}>
                <input
                    type="email"
                    placeholder={t('dashboard.diagnostic.search.placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.searchInput}
                />
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className={styles.searchBtn}
                >
                    {loading ? t('common.processing') : <MagnifyingGlass size={20} />}
                </button>
            </div>

            {searchedPatient && (
                <div className={styles.resultCard}>
                    <div className={styles.resultAvatar}>
                        <Person size={32} />
                    </div>
                    <h3 className={styles.resultName}>{searchedPatient.full_name}</h3>
                    <p className={styles.resultEmail}>{searchedPatient.email}</p>

                    <button
                        onClick={assignPatient}
                        disabled={loading}
                        className={styles.assignBtn}
                    >
                        {t('dashboard.diagnostic.search.assign_btn')}
                    </button>
                </div>
            )}

            {showRegister && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>{t('dashboard.diagnostic.search.register_title')}</h3>
                        <input
                            placeholder={t('dashboard.diagnostic.search.name_ph')}
                            value={newName} onChange={e => setNewName(e.target.value)}
                            className={styles.modalInput}
                        />
                        <input
                            placeholder={t('dashboard.diagnostic.search.email_ph')}
                            value={newEmail} onChange={e => setNewEmail(e.target.value)}
                            className={styles.modalInput}
                        />
                        <input
                            placeholder={t('dashboard.diagnostic.search.phone_ph')}
                            value={newPhone} onChange={e => setNewPhone(e.target.value)}
                            className={styles.modalInput}
                        />
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowRegister(false)} className={styles.cancelBtn}>{t('common.cancel')}</button>
                            <button onClick={handleRegister} disabled={loading} className={styles.registerBtn}>{t('dashboard.diagnostic.search.register_btn')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}