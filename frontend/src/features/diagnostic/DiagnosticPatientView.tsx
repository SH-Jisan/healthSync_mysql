import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/shared/lib/supabaseClient';
import { ArrowLeft, CheckCircle, Upload, Plus, Prescription, Flask, CaretLeft, Info, Calendar } from 'phosphor-react';
import UploadModal from '../upload/UploadModal';
import SharedTestModal from '../dashboard/widgets/SharedTestModal';
import styles from './styles/DiagnosticPatientView.module.css';

interface Patient {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
}

interface Order {
    id: string;
    test_names: string[];
    total_amount: number;
    status: 'PAID' | 'DUE';
    report_status: 'PENDING' | 'COMPLETED';
    created_at: string;
}

interface DoctorTestOrder {
    id: string;
    title: string;
    key_findings: string[];
    created_at: string;
    uploader: { full_name: string; };
}

interface DiagnosticOrderRow {
    id: string;
    payment_id: string;
    status: 'BOOKED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'QUALITY_CHECK' | 'DOCTOR_REVIEW' | 'APPROVED' | 'REJECTED';
    technician_name?: string;
    doctor_notes?: string;
    created_at: string;
    test?: {
        name: string;
        category?: string;
        base_price: number;
    };
}

interface Props {
    patient: Patient;
    onBack: () => void;
}

export default function DiagnosticPatientView({ patient, onBack }: Props) {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<Order[]>([]);
    const [doctorOrders, setDoctorOrders] = useState<DoctorTestOrder[]>([]);
    const [diagnosticOrders, setDiagnosticOrders] = useState<DiagnosticOrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Billing/Invoicing states
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [testsToBill, setTestsToBill] = useState<string[]>([]);

    // State workflows
    const [selectedOrderForApproval, setSelectedOrderForApproval] = useState<DiagnosticOrderRow | null>(null);
    const [technicianNameInput, setTechnicianNameInput] = useState('');
    const [selectedOrderForTech, setSelectedOrderForTech] = useState<DiagnosticOrderRow | null>(null);
    const [doctorNotesInput, setDoctorNotesInput] = useState('');

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch payments/bills
        const { data: paymentsData } = await supabase.from('patient_payments')
            .select('*')
            .eq('patient_id', patient.id)
            .eq('provider_id', user.id)
            .order('created_at', { ascending: false });
        if (paymentsData) setOrders(paymentsData as Order[]);

        // 2. Fetch doctor referrals/prescribed test orders
        const { data: docOrdersData } = await supabase.from('medical_events')
            .select('id, title, key_findings, created_at, uploader:uploader_id(full_name)')
            .eq('patient_id', patient.id)
            .eq('event_type', 'TEST_ORDER')
            .order('created_at', { ascending: false })
            .limit(5);
        if (docOrdersData) setDoctorOrders(docOrdersData as any[]);

        // 3. Fetch detailed diagnostic test status orders
        const { data: diagOrdersData } = await supabase.from('diagnostic_orders')
            .select('id, payment_id, status, technician_name, doctor_notes, created_at, test:MedicalTest(*)')
            .eq('patient_id', patient.id)
            .eq('diagnostic_id', user.id)
            .order('created_at', { ascending: false });

        if (diagOrdersData) {
            setDiagnosticOrders(diagOrdersData as unknown as DiagnosticOrderRow[]);
        }
        setLoading(false);
    }, [patient.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const togglePayment = async (order: Order) => {
        const newStatus = order.status === 'PAID' ? 'DUE' : 'PAID';
        await supabase.from('patient_payments').update({ status: newStatus }).eq('id', order.id);
        fetchData();
    };

    const handleConvertOrder = (testNames: string[]) => {
        setTestsToBill(testNames);
        setShowNewOrder(true);
    };

    const handleUpdateStatus = async (orderId: string, status: string, additionalData: any = {}) => {
        try {
            const { error } = await supabase
                .from('diagnostic_orders')
                .update({ status, ...additionalData })
                .eq('id', orderId);

            if (error) throw error;
            alert(`Test status updated to: ${status.replace(/_/g, ' ')}`);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to update status:', err);
            alert('Failed: ' + err.message);
        }
    };

    const handleOpenTechInput = (order: DiagnosticOrderRow) => {
        setSelectedOrderForTech(order);
        setTechnicianNameInput('');
    };

    const submitTechInput = async () => {
        if (!selectedOrderForTech || !technicianNameInput) return;
        await handleUpdateStatus(selectedOrderForTech.id, 'PROCESSING', { technician_name: technicianNameInput });
        setSelectedOrderForTech(null);
    };

    const handleOpenApproval = (order: DiagnosticOrderRow) => {
        setSelectedOrderForApproval(order);
        setDoctorNotesInput('');
    };

    const submitApproval = async () => {
        if (!selectedOrderForApproval) return;
        
        // Approve diagnostic order and log notes
        await handleUpdateStatus(selectedOrderForApproval.id, 'APPROVED', { doctor_notes: doctorNotesInput });
        setSelectedOrderForApproval(null);
    };

    if (loading) return <div className={styles.loading}>Loading diagnostic record...</div>;

    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className={styles.header}>
                <button onClick={onBack} className={styles.backBtn}>
                    <CaretLeft size={24} weight="bold" />
                    <span>{t('common.back')}</span>
                </button>
                <div className={styles.patientInfo}>
                    <h2 className={styles.patientName}>{patient.full_name}</h2>
                    <span className={styles.patientContact}>{patient.phone || patient.email}</span>
                </div>
            </div>

            <div className={styles.content}>
                {/* 1. Doctor's Referrals / Prescription Orders */}
                {doctorOrders.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <Prescription size={24} weight="duotone" className={styles.sectionIcon} />
                            Clinical Test Referrals
                        </h3>
                        <div className={styles.cardGrid}>
                            {doctorOrders.map(docOrder => (
                                <motion.div key={docOrder.id} className={styles.docOrderCard} whileHover={{ y: -5 }}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.docInfo}>
                                            <span className={styles.docName}>
                                                Referral by {t('dashboard.diagnostic.view.dr_prefix')} {docOrder.uploader?.full_name}
                                            </span>
                                            <span className={styles.docDate}>
                                                {new Date(docOrder.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.testList}>
                                        <span className={styles.label}>Tests Prescribed:</span>
                                        <p>{docOrder.key_findings && docOrder.key_findings.join(', ')}</p>
                                    </div>
                                    <button className={styles.actionBtn} onClick={() => handleConvertOrder(docOrder.key_findings)}>
                                        <Flask size={18} weight="bold" />
                                        Create Invoice Billing
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Detailed Diagnostic Tests Workflow */}
                <div className={styles.section} style={{ marginTop: '24px' }}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>
                            <Flask size={24} weight="duotone" className={styles.sectionIcon} />
                            Detailed Test Workflows
                        </h3>
                    </div>

                    {diagnosticOrders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No diagnostic test orders active. Create billing invoices to start workflows.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {diagnosticOrders.map(diagOrder => (
                                <div key={diagOrder.id} className="t-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '16px', color: '#f1f5f9' }}>{diagOrder.test?.name || 'Diagnostic Test'}</h4>
                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                                            Category: {diagOrder.test?.category} | Price: ৳{diagOrder.test?.base_price}
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
                                            <span className={`t-badge ${
                                                diagOrder.status === 'APPROVED' ? 't-badge-success' : 
                                                diagOrder.status === 'REJECTED' ? 't-badge-danger' : 
                                                diagOrder.status === 'BOOKED' ? 't-badge-secondary' : 't-badge-info'
                                            }`}>
                                                Status: {diagOrder.status}
                                            </span>
                                            {diagOrder.technician_name && (
                                                <span style={{ color: '#cbd5e1' }}>Technician: {diagOrder.technician_name}</span>
                                            )}
                                        </div>
                                        {diagOrder.doctor_notes && (
                                            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#38bdf8', fontStyle: 'italic' }}>
                                                Clinical Notes: "{diagOrder.doctor_notes}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Action toggles depending on status */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {diagOrder.status === 'BOOKED' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(diagOrder.id, 'SAMPLE_COLLECTED')}
                                                className="t-btn t-btn-primary"
                                            >
                                                Collect Sample
                                            </button>
                                        )}

                                        {diagOrder.status === 'SAMPLE_COLLECTED' && (
                                            <button 
                                                onClick={() => handleOpenTechInput(diagOrder)}
                                                className="t-btn t-btn-warning"
                                            >
                                                Assign Tech & Process
                                            </button>
                                        )}

                                        {diagOrder.status === 'PROCESSING' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(diagOrder.id, 'QUALITY_CHECK')}
                                                className="t-btn t-btn-info"
                                            >
                                                Complete Lab Test
                                            </button>
                                        )}

                                        {diagOrder.status === 'QUALITY_CHECK' && (
                                            <button 
                                                onClick={() => handleUpdateStatus(diagOrder.id, 'DOCTOR_REVIEW')}
                                                className="t-btn t-btn-primary"
                                            >
                                                Submit to Clinical Review
                                            </button>
                                        )}

                                        {diagOrder.status === 'DOCTOR_REVIEW' && (
                                            <button 
                                                onClick={() => handleOpenApproval(diagOrder)}
                                                className="t-btn t-btn-success"
                                            >
                                                Sign & Approve Report
                                            </button>
                                        )}

                                        {diagOrder.status === 'APPROVED' && (
                                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                                                <CheckCircle size={18} weight="fill" /> Verified & Signed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Invoices & Billing list */}
                <div className={styles.section} style={{ marginTop: '24px' }}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>
                            <Flask size={24} weight="duotone" className={styles.sectionIcon} />
                            Billing Invoices ({orders.length})
                        </h3>
                        <button onClick={() => { setTestsToBill([]); setShowNewOrder(true); }} className={styles.primaryBtn}>
                            <Plus size={18} weight="bold" />
                            New Billing Invoice
                        </button>
                    </div>

                    <div className={styles.ordersList}>
                        {orders.map(order => (
                            <div key={order.id} className={`${styles.orderRow} ${order.report_status === 'COMPLETED' ? styles.completed : ''}`}>
                                <div className={styles.orderMain}>
                                    <h4 className={styles.testTitle}>{order.test_names.join(', ')}</h4>
                                    <small className={styles.timestamp}>
                                        <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                        {new Date(order.created_at).toLocaleString()}
                                    </small>
                                </div>
                                <div className={styles.orderMeta}>
                                    <span className={styles.amount}>৳{order.total_amount}</span>
                                    <span
                                        onClick={() => togglePayment(order)}
                                        className={`${styles.badge} ${order.status === 'PAID' ? styles.badgeSuccess : styles.badgeWarning}`}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                                <div className={styles.orderActions}>
                                    {order.report_status === 'PENDING' ? (
                                        <span className={styles.statusText} style={{ color: '#94a3b8' }}>
                                            <Info size={16} /> Reports In Progress
                                        </span>
                                    ) : (
                                        <span className={styles.statusText} style={{ color: '#10b981' }}>
                                            <CheckCircle size={20} weight="fill" /> Completed
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {orders.length === 0 && (
                            <div className={styles.emptyState}>
                                <p>No diagnostic invoices found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal - Billing */}
            {showNewOrder && (
                <SharedTestModal
                    patientId={patient.id}
                    role="DIAGNOSTIC"
                    onClose={() => setShowNewOrder(false)}
                    onSuccess={() => fetchData()}
                    preSelectedTests={testsToBill}
                />
            )}

            {/* Modal - Assign Tech & Process */}
            {selectedOrderForTech && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Lab Processing</h3>
                        <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '16px' }}>
                            Test: <strong>{selectedOrderForTech.test?.name}</strong>
                        </p>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Lab Technician Name</label>
                            <input 
                                type="text"
                                placeholder="e.g. Dr. Alex Vance"
                                value={technicianNameInput}
                                onChange={e => setTechnicianNameInput(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setSelectedOrderForTech(null)} className="t-btn t-btn-secondary">Cancel</button>
                            <button onClick={submitTechInput} className="t-btn t-btn-primary" disabled={!technicianNameInput}>
                                Send to Processing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal - Sign & Approve */}
            {selectedOrderForApproval && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modalContent} t-card`}>
                        <h3 className={styles.modalTitle}>Clinical Review & Digital Signature</h3>
                        <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '16px' }}>
                            Signing Report for: <strong>{selectedOrderForApproval.test?.name}</strong>
                        </p>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Clinical Findings & Notes</label>
                            <textarea 
                                placeholder="Write primary clinical observations, reference values, or warnings..."
                                value={doctorNotesInput}
                                onChange={e => setDoctorNotesInput(e.target.value)}
                                className={styles.textarea}
                                rows={4}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setSelectedOrderForApproval(null)} className="t-btn t-btn-secondary">Cancel</button>
                            <button onClick={submitApproval} className="t-btn t-btn-success" disabled={!doctorNotesInput}>
                                Sign & Approve Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}