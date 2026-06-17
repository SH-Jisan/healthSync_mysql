import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/shared/lib/supabaseClient';
import {
    Prescription, Flask, User,
    ArrowRight, Robot, Clock, FileText, Receipt
} from 'phosphor-react';
import { format } from 'date-fns';
import EventDetailsModal from '@/features/timeline/EventDetailsModal';
import styles from './PatientPrescriptions.module.css';

// Unified Interface for both Doctor Orders and Diagnostic Invoices
interface MedicalItem {
    id: string;
    title: string; // Doctor: Title, Diagnostic: Test Names
    event_type: 'PRESCRIPTION' | 'TEST_ORDER' | 'DIAGNOSTIC_REPORT';
    event_date: string;
    summary?: string;
    uploader?: {
        full_name: string;
        specialty?: string;
    };
    ai_details?: any;
    medicines?: any[];
    key_findings?: string[];

    // Diagnostic Specific Fields
    total_amount?: number;
    payment_status?: string;
    report_status?: string;
    provider_name?: string;
}

export default function PatientPrescriptions() {
    const { t } = useTranslation();
    const [items, setItems] = useState<MedicalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'prescription' | 'tests'>('prescription');

    const tabs = [
        { id: 'prescription', label: t('patient.prescriptions.tab_rx') || 'Prescriptions', Icon: Prescription },
        { id: 'tests', label: t('patient.prescriptions.tab_tests') || 'Tests', Icon: Flask },
    ] as const;

    const fetchRecords = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // 1. Fetch Doctor Orders & Prescriptions (medical_events)
            const { data: doctorEvents } = await supabase
                .from('medical_events')
                .select('*, uploader:uploader_id(full_name, specialty)')
                .eq('patient_id', user.id)
                .in('event_type', ['PRESCRIPTION', 'TEST_ORDER'])
                .order('event_date', { ascending: false });

            // 2. Fetch Diagnostic Invoices/Reports (patient_payments)
            const { data: diagnosticEvents } = await supabase
                .from('patient_payments')
                .select('*, provider:provider_id(full_name)') // Assuming profiles table has full_name
                .eq('patient_id', user.id)
                .order('created_at', { ascending: false });

            // 3. Transform & Merge Data
            const formattedDoctorEvents: MedicalItem[] = (doctorEvents || []).map((evt: any) => ({
                ...evt,
                event_type: evt.event_type // 'PRESCRIPTION' or 'TEST_ORDER'
            }));

            const formattedDiagnosticEvents: MedicalItem[] = (diagnosticEvents || []).map((inv: any) => ({
                id: inv.id,
                title: inv.test_names ? inv.test_names.join(', ') : 'Diagnostic Invoice',
                event_type: 'DIAGNOSTIC_REPORT', // Custom type for UI
                event_date: inv.created_at,
                summary: `Invoice #${inv.id.slice(0, 8).toUpperCase()} - Status: ${inv.report_status}`,
                uploader: {
                    full_name: inv.provider?.full_name || 'Diagnostic Center',
                    specialty: 'Diagnostic'
                },
                key_findings: inv.test_names,
                total_amount: inv.total_amount,
                payment_status: inv.status,
                report_status: inv.report_status,
                // AI details might be linked via report upload logic elsewhere,
                // but for now keeping it simple. If reports are uploaded to medical_events separately,
                // they will appear in Timeline. This is for tracking Orders.
            }));

            // 4. Merge and Sort by Date
            const allItems = [...formattedDiagnosticEvents, ...formattedDoctorEvents].sort((a, b) =>
                new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
            );

            setItems(allItems);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleAnalyze = async (e: React.MouseEvent, item: MedicalItem) => {
        e.stopPropagation();
        setAnalyzingId(item.id);

        try {
            // AI Analysis Logic (Simplified for brevity)
            let reportText = `Type: ${item.event_type}\nDate: ${item.event_date}\nProvider: ${item.uploader?.full_name}\n`;
            if (item.key_findings) reportText += `Tests: ${item.key_findings.join(', ')}`;
            if (item.summary) reportText += `\nSummary: ${item.summary}`;

            const { data, error } = await supabase.functions.invoke('process-medical-report', {
                body: {
                    reportText: reportText,
                    patient_id: (await supabase.auth.getUser()).data.user?.id,
                    file_hash: `manual_${item.id}`,
                }
            });

            if (error) throw error;

            if (data?.data) {
                // Update local state or DB
                alert("Analysis generated! (Note: In a real app, this would save to DB)");
            }
        } catch (err) {
            console.error(err);
            alert("Analysis failed or no report text available.");
        } finally {
            setAnalyzingId(null);
        }
    };

    // Helper to render icon based on type
    const getIcon = (type: string) => {
        if (type === 'PRESCRIPTION') return <Prescription size={24} color="#059669" />;
        if (type === 'TEST_ORDER') return <Flask size={24} color="#4338ca" />;
        if (type === 'DIAGNOSTIC_REPORT') return <Receipt size={24} color="#D97706" />;
        return <FileText size={24} />;
    };

    // Helper to render badge style
    const getBadgeStyle = (type: string) => {
        if (type === 'PRESCRIPTION') return { background: '#ECFDF5', color: '#059669' };
        if (type === 'TEST_ORDER') return { background: '#EEF2FF', color: '#4338ca' };
        return { background: '#FFFBEB', color: '#D97706' }; // Diagnostic
    };

    const filteredItems = items.filter(item => {
        if (activeTab === 'prescription') return item.event_type === 'PRESCRIPTION';
        // Tests tab includes both Doctor Orders (TEST_ORDER) and Diagnostic Invoices (DIAGNOSTIC_REPORT)
        return item.event_type === 'TEST_ORDER' || item.event_type === 'DIAGNOSTIC_REPORT';
    });

    if (loading) return <div className={styles.loading}>{t('common.loading') || 'Loading...'}</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>{t('patient.prescriptions.title') || 'My Prescriptions & Tests'}</h1>
                    <p>{t('patient.prescriptions.subtitle') || 'Manage orders from doctors and diagnostic centers'}</p>
                </div>
            </div>

            {/* Tabs */}
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
                                    layoutId="activePill"
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

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {filteredItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            {activeTab === 'prescription' ? (
                                <Prescription size={48} weight="duotone" />
                            ) : (
                                <Flask size={48} weight="duotone" />
                            )}
                            <h3>{t('common.no_records') || 'No records found'}</h3>
                            <p>{activeTab === 'prescription' ? 'No prescriptions found.' : 'No test orders or reports found.'}</p>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {filteredItems.map((item) => (
                                <div
                                    key={`${item.event_type}-${item.id}`}
                                    className={styles.card}
                                    onClick={() => setSelectedItem(item)}
                                    style={{ borderLeft: item.event_type === 'DIAGNOSTIC_REPORT' ? '4px solid #F59E0B' : '1px solid #e2e8f0' }}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.iconBox} style={getBadgeStyle(item.event_type)}>
                                            {getIcon(item.event_type)}
                                        </div>
                                        <span className={styles.date}>
                                            {format(new Date(item.event_date), 'dd MMM, yyyy')}
                                        </span>
                                    </div>

                                    <div className={styles.typeBadge}>
                                        {item.event_type === 'DIAGNOSTIC_REPORT' ? 'INVOICE / REPORT' : item.event_type.replace('_', ' ')}
                                    </div>

                                    <h3 className={styles.cardTitle}>{item.title}</h3>

                                    <div className={styles.doctorInfo}>
                                        <User size={16} weight="fill" />
                                        <span>{item.uploader?.full_name || 'Unknown Provider'}</span>
                                    </div>

                                    {/* Special UI for Diagnostic Reports */}
                                    {item.event_type === 'DIAGNOSTIC_REPORT' && (
                                        <div className={styles.statusRow}>
                                            <span className={`${styles.statusPill} ${item.payment_status === 'PAID' ? styles.paid : styles.due}`}>
                                                {item.payment_status}
                                            </span>
                                            <span className={`${styles.statusPill} ${item.report_status === 'COMPLETED' ? styles.completed : styles.pending}`}>
                                                {item.report_status === 'COMPLETED' ? 'Report Ready' : 'Processing'}
                                            </span>
                                        </div>
                                    )}

                                    <div className={styles.footer}>
                                        {/* Show Analyze button only for Prescriptions or Completed Reports */}
                                        {(item.event_type === 'PRESCRIPTION' || item.report_status === 'COMPLETED') ? (
                                            <button
                                                className={styles.analyzeBtn}
                                                onClick={(e) => handleAnalyze(e, item)}
                                                disabled={!!analyzingId}
                                            >
                                                {analyzingId === item.id ? <Clock size={16} className={styles.spin} /> : <Robot size={16} weight="fill" />}
                                                {analyzingId === item.id ? 'Analyzing...' : 'AI Insight'}
                                            </button>
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                {item.event_type === 'TEST_ORDER' ? 'Suggested by Doctor' : 'Waiting for Upload'}
                                            </span>
                                        )}

                                        <button className={styles.viewBtn}>
                                            {t('common.view') || 'View'} <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {selectedItem && (
                <EventDetailsModal
                    event={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onUpdate={fetchRecords}
                    onDelete={fetchRecords}
                />
            )}
        </div>
    );
}