// File: HealthSync/web/src/features/timeline/TimelineView.tsx

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import type { MedicalEvent } from '../../types';
import TimelineTile from './TimelineTile';
import EventDetailsModal from './EventDetailsModal';
import styles from './styles/TimelineView.module.css';

export default function TimelineView({ userId }: { userId?: string }) {
    const { t } = useTranslation();
    const [events, setEvents] = useState<MedicalEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<MedicalEvent | null>(null);

    const fetchTimeline = useCallback(async () => {
        setLoading(true);

        let targetId = userId;
        if (!targetId) {
            const { data } = await supabase.auth.getUser();
            targetId = data.user?.id;
        }
        if (!targetId) {
            setLoading(false);
            return;
        }

        // [UPDATED] Filter to show ONLY REPORTS (and Vaccinations/Surgeries if any)
        // Excluding 'PRESCRIPTION' and 'TEST_ORDER' as requested
        const { data, error } = await supabase
            .from('medical_events')
            .select(
                '*, uploader:uploader_id(full_name, specialty), profiles:patient_id(full_name, phone)'
            )
            .eq('patient_id', targetId)
            .in('event_type', ['REPORT', 'VACCINATION', 'SURGERY', 'GENERIC']) // Whitelist types
            .order('event_date', { ascending: false });

        if (error) {
            console.error('Error fetching timeline:', error);
        }

        if (!error && data) {
            setEvents(data as unknown as MedicalEvent[]);
        }

        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchTimeline();
    }, [fetchTimeline]);

    if (loading) {
        return <div className={styles.loading}>{t('timeline.loading', 'Loading history...')}</div>;
    }

    if (events.length === 0) {
        return (
            <div className={styles.noRecords}>
                <h3>{t('timeline.no_records', 'No medical reports found')}</h3>
                <p>
                    {t('timeline.report_instruction', 'Timeline will update when diagnostic centers upload reports.')}
                </p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.timeline}>
                {events.map((event, index) => (
                    <div key={event.id} onClick={() => setSelectedEvent(event)}>
                        <TimelineTile
                            event={event}
                            isLast={index === events.length - 1}
                        />
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {selectedEvent && (
                    <EventDetailsModal
                        key="event-modal"
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        onUpdate={fetchTimeline}
                        onDelete={fetchTimeline}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}