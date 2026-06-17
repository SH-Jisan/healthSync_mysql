import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash, Megaphone, Clock, CheckCircle, Spinner, PencilSimple } from 'phosphor-react';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { bloodApi } from '@/services/api/blood';
import type { BloodRequest } from '@/services/api/blood';
import styles from './styles/MyBloodRequests.module.css';

export default function MyBloodRequests() {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();

    // 1. Fetch User ID
    const { data: userId } = useQuery({
        queryKey: ['userSession'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user?.id;
        }
    });

    // 2. Fetch Requests using React Query
    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['myBloodRequests', userId],
        queryFn: () => bloodApi.getMyRequests(userId),
        enabled: !!userId, // Only run if userId is available
    });

    // 3. Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: bloodApi.deleteRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBloodRequests'] });
        },
        onError: () => {
            alert(t('blood.my_requests.delete_fail', 'Failed to delete request.'));
        }
    });

    const handleDelete = async (id: string) => {
        if (!confirm(t('blood.my_requests.confirm_delete', 'Are you sure?'))) return;
        deleteMutation.mutate(id);
    };

    // Edit states
    const [editRequest, setEditRequest] = useState<BloodRequest | null>(null);
    const [editBloodGroup, setEditBloodGroup] = useState('');
    const [editHospitalName, setEditHospitalName] = useState('');
    const [editUrgency, setEditUrgency] = useState<'NORMAL' | 'CRITICAL'>('NORMAL');
    const [editStatus, setEditStatus] = useState('OPEN');
    const [editReason, setEditReason] = useState('');

    const handleOpenEdit = (req: BloodRequest) => {
        setEditRequest(req);
        setEditBloodGroup(req.blood_group);
        setEditHospitalName(req.hospital_name);
        setEditUrgency(req.urgency);
        setEditStatus(req.status);
        setEditReason(req.reason || '');
    };

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<BloodRequest> }) =>
            bloodApi.updateRequest(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myBloodRequests'] });
            setEditRequest(null);
            alert("Request updated successfully!");
        },
        onError: () => {
            alert("Failed to update request.");
        }
    });

    const handleSaveEdit = () => {
        if (!editRequest) return;
        if (!editBloodGroup || !editHospitalName) {
            alert("Please fill in blood group and hospital name.");
            return;
        }
        updateMutation.mutate({
            id: editRequest.id,
            updates: {
                blood_group: editBloodGroup,
                hospital_name: editHospitalName,
                urgency: editUrgency,
                status: editStatus,
                reason: editReason
            }
        });
    };

    if (isLoading) return (
        <div className={styles.loadingWrapper}>
            <Spinner size={32} className={styles.spinner} />
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <Megaphone size={32} weight="duotone" />
                    <span className="t-text-gradient">{t('blood.my_requests.title')}</span>
                </h2>
                <p className={styles.subtitle}>{t('blood.my_requests.subtitle')}</p>
            </div>

            <div className={styles.list}>
                <AnimatePresence>
                    {requests.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={styles.emptyState}
                        >
                            <p>{t('blood.my_requests.no_requests')}</p>
                        </motion.div>
                    ) : (
                        requests.map((req, idx) => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`${styles.card} t-card-glass ${req.urgency === 'CRITICAL' ? styles.cardCritical : ''}`}
                            >
                                <div className={styles.cardContent}>
                                    <div className={styles.leftCol}>
                                        <div className={`${styles.bloodGroup} ${req.urgency === 'CRITICAL' ? styles.bgCritical : ''}`}>
                                            {req.blood_group}
                                        </div>
                                    </div>
                                    <div className={styles.mainInfo}>
                                        <div className={styles.topRow}>
                                            <h3 className={styles.hospital}>{req.hospital_name}</h3>
                                            {req.status === 'FULFILLED' && (
                                                <span className={styles.statusBadge}>
                                                    <CheckCircle weight="fill" />
                                                    {t('blood.my_requests.fulfilled')}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.metadata}>
                                            <span className={styles.timeText}>
                                                <Clock size={14} />
                                                {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: i18n.language === 'bn' ? bn : undefined })}
                                            </span>
                                        </div>
                                        {req.reason && <p className={styles.reasonText}>"{req.reason}"</p>}
                                    </div>
                                    <div className={styles.actions}>
                                        <button
                                            onClick={() => handleOpenEdit(req)}
                                            className={styles.editBtn}
                                            title="Edit Request"
                                            disabled={deleteMutation.isPending}
                                        >
                                            <PencilSimple size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(req.id)}
                                            className={styles.deleteBtn}
                                            title={t('blood.my_requests.delete_btn')}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash size={20} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
            {/* Edit Modal */}
            {editRequest && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>Edit Blood Request</h3>
                        
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Blood Group</label>
                                <select 
                                    value={editBloodGroup}
                                    onChange={e => setEditBloodGroup(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                </select>
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Urgency</label>
                                <select 
                                    value={editUrgency}
                                    onChange={e => setEditUrgency(e.target.value as any)}
                                    className={styles.select}
                                >
                                    <option value="NORMAL">Normal</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Hospital Name</label>
                                <input 
                                    type="text" 
                                    value={editHospitalName}
                                    onChange={e => setEditHospitalName(e.target.value)}
                                    className={styles.input}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Status</label>
                                <select 
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="OPEN">Open</option>
                                    <option value="FULFILLED">Fulfilled</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Reason / Note</label>
                            <textarea 
                                value={editReason}
                                onChange={e => setEditReason(e.target.value)}
                                className={styles.textarea}
                                rows={3}
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button 
                                onClick={() => setEditRequest(null)}
                                className={styles.cancelModalBtn}
                                disabled={updateMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveEdit}
                                className={styles.saveBtn}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}