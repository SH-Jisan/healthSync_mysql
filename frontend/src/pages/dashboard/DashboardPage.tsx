import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import CitizenHome from './CitizenHome';
import DoctorHome from './DoctorHome';
import HospitalHome from './HospitalHome';
import DiagnosticHome from "./DiagnosticHome";
import styles from './styles/DashboardPage.module.css';

export default function DashboardPage() {
    const { t } = useTranslation();
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRole() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const roleFromMeta = user.user_metadata?.role;

                if (!roleFromMeta) {
                    const { data } = await supabase.from('User').select('role').eq('id', user.id).single();
                    setRole(data?.role || 'CITIZEN');
                } else {
                    setRole(roleFromMeta);
                }
            }
            setLoading(false);
        }
        fetchRole();
    }, []);

    if (loading) return <div className={styles.loading}>{t('dashboard.loading')}</div>;

    switch (role) {
        case 'DOCTOR':
            return <DoctorHome />;
        case 'HOSPITAL':
            return <HospitalHome />;
        case 'DIAGNOSTIC':
            return <DiagnosticHome />;
        case 'CITIZEN':
        default:
            return <CitizenHome />;
    }
}