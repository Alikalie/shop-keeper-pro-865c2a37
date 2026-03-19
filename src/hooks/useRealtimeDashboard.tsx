import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to realtime changes on sales, products, customers, loans, stock_entries
 * and calls onUpdate when any change happens.
 */
export function useRealtimeDashboard(ownerId: string | null, onUpdate: () => void) {
  useEffect(() => {
    if (!ownerId) return;

    const channel = supabase
      .channel(`dashboard-${ownerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_entries' }, onUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, onUpdate]);
}
