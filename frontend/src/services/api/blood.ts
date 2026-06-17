import { supabase } from '@/shared/lib/supabaseClient';

export interface BloodRequest {
    id: string;
    blood_group: string;
    hospital_name: string;
    urgency: 'NORMAL' | 'CRITICAL';
    status: string;
    created_at: string;
    reason: string;
    requester_id: string;
    accepted_count?: number;
}

export const bloodApi = {
    getMyRequests: async (userId: string | undefined) => {
        if (!userId) return [];

        const { data, error } = await supabase
            .from('blood_requests')
            .select('*')
            .eq('requester_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as BloodRequest[];
    },

    deleteRequest: async (id: string) => {
        const { error } = await supabase
            .from('blood_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    updateRequest: async (id: string, updates: Partial<BloodRequest>) => {
        const { error } = await supabase
            .from('blood_requests')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    }
};

