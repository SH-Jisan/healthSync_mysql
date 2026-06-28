import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { House, User, Users, Drop, Bed, ShieldCheck } from 'phosphor-react';
import { motion, AnimatePresence } from 'framer-motion';
import HospitalOverview from '../../features/hospital/HospitalOverview';
import HospitalDoctors from '../../features/hospital/HospitalDoctors';
import HospitalPatients from '../../features/hospital/HospitalPatients';
import HospitalBloodBank from "../../features/hospital/HospitalBloodBank";
import HospitalBeds from '../../features/hospital/HospitalBeds';
import HospitalAuditLogs from '../../features/hospital/HospitalAuditLogs';
import styles from './styles/HospitalHome.module.css';

export default function HospitalHome() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'patients' | 'blood' | 'beds' | 'audit'>('overview');

    const tabs = [
        { id: 'overview', label: t('dashboard.hospital.tabs.overview'), Icon: House },
        { id: 'doctors', label: t('dashboard.hospital.tabs.doctors'), Icon: User },
        { id: 'patients', label: t('dashboard.hospital.tabs.patients'), Icon: Users },
        { id: 'blood', label: t('dashboard.hospital.tabs.blood'), Icon: Drop },
        { id: 'beds', label: t('dashboard.hospital.tabs.beds'), Icon: Bed },
        { id: 'audit', label: 'Audit Trail', Icon: ShieldCheck }
    ] as const;

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
        >
            {/* Tab Navigation with Sliding Pill */}
            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.active : ''}`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="hospitalActivePill"
                                    className={styles.activePill}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <span className={styles.tabContent}>
                                <tab.Icon size={20} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content Area with Staggered Fade */}
            <div className={styles.contentArea}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'overview' && <HospitalOverview />}
                        {activeTab === 'doctors' && <HospitalDoctors />}
                        {activeTab === 'patients' && <HospitalPatients />}
                        {activeTab === 'blood' && <HospitalBloodBank />}
                        {activeTab === 'beds' && <HospitalBeds />}
                        {activeTab === 'audit' && <HospitalAuditLogs />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}