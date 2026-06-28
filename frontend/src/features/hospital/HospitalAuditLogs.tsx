import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { ShieldCheck, Info, Clock, MagnifyingGlass, Eye } from 'phosphor-react';
import styles from './styles/HospitalAuditLogs.module.css';

interface AuditLogRow {
    id: string;
    action: string;
    table_name: string;
    record_id?: string;
    ip_address?: string;
    device_info?: string;
    previous_value?: string;
    new_value?: string;
    created_at: string;
}

export default function HospitalAuditLogs() {
    const [logs, setLogs] = useState<AuditLogRow[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

    const fetchLogs = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch logs for this hospital
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setLogs(data as AuditLogRow[]);
            setFilteredLogs(data as AuditLogRow[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        if (!query) {
            setFilteredLogs(logs);
            return;
        }

        const filtered = logs.filter(
            log =>
                log.action.toLowerCase().includes(query) ||
                log.table_name.toLowerCase().includes(query) ||
                (log.ip_address && log.ip_address.toLowerCase().includes(query)) ||
                (log.device_info && log.device_info.toLowerCase().includes(query))
        );
        setFilteredLogs(filtered);
    };

    const renderJsonDiff = (prevStr?: string, newStr?: string) => {
        try {
            const prevObj = prevStr ? JSON.parse(prevStr) : null;
            const newObj = newStr ? JSON.parse(newStr) : null;

            return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                    <div>
                        <small style={{ color: '#ef4444', fontWeight: 'bold' }}>PREVIOUS VALUE</small>
                        <pre style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1', overflowX: 'auto', maxHeight: '200px' }}>
                            {prevObj ? JSON.stringify(prevObj, null, 2) : 'N/A (NEW RECORD)'}
                        </pre>
                    </div>
                    <div>
                        <small style={{ color: '#10b981', fontWeight: 'bold' }}>NEW VALUE</small>
                        <pre style={{ background: '#1e293b', padding: '12px', borderRadius: '6px', fontSize: '11px', color: '#cbd5e1', overflowX: 'auto', maxHeight: '200px' }}>
                            {newObj ? JSON.stringify(newObj, null, 2) : 'N/A (DELETED RECORD)'}
                        </pre>
                    </div>
                </div>
            );
        } catch (e) {
            return <p style={{ color: '#ef4444' }}>Error parsing audit changes.</p>;
        }
    };

    if (loading) return <div className={styles.loading}>Loading system security trail...</div>;

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={26} style={{ color: '#10b981' }} /> System Audit Trail & Logs
                    </h2>
                    <p className={styles.subtitle}>Real-time compliance monitoring, data mutations, and network security audit tracks.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className={styles.searchContainer}>
                <div className={styles.searchWrapper}>
                    <MagnifyingGlass size={18} />
                    <input
                        type="text"
                        placeholder="Search by Action, Table name, IP address, or Browser..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className={styles.searchInput}
                    />
                </div>
            </div>

            {/* Logs Table */}
            {filteredLogs.length === 0 ? (
                <div className={styles.emptyState}>
                    <Info size={40} />
                    <p>No audit trail records match your current filter.</p>
                </div>
            ) : (
                <div className={styles.tableCard} style={{ background: '#181a1f', borderRadius: '8px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Module / Table</th>
                                <th>Target ID</th>
                                <th>Client IP</th>
                                <th>Device / Browser</th>
                                <th>Changes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => (
                                <tr key={log.id} className={styles.tableRow}>
                                    <td style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
                                        <Clock size={14} /> {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td>
                                        <span className={`t-badge ${
                                            log.action === 'INSERT' ? 't-badge-success' : 
                                            log.action === 'DELETE' ? 't-badge-danger' : 't-badge-info'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: '600', color: '#f1f5f9' }}>{log.table_name}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1' }}>
                                        {log.record_id ? log.record_id.slice(0, 8) + '...' : 'N/A'}
                                    </td>
                                    <td style={{ color: '#cbd5e1' }}>{log.ip_address || 'N/A'}</td>
                                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '12px' }} title={log.device_info}>
                                        {log.device_info || 'N/A'}
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                                            className="t-btn t-btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                                        >
                                            <Eye size={12} /> {selectedLog?.id === log.id ? 'Hide' : 'Inspect'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Inspect Modal/Panel under the table */}
            {selectedLog && (
                <div style={{ marginTop: '24px', background: '#1e222b', border: '1px solid #475569', borderRadius: '8px', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={18} style={{ color: '#38bdf8' }} /> Inspection View: Record mutation details
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                        Row ID: <code>{selectedLog.record_id}</code> | Time: {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                    {renderJsonDiff(selectedLog.previous_value, selectedLog.new_value)}
                </div>
            )}
        </div>
    );
}
