import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Returns the owner's user_id for the current user.
 * If the user is staff in an org, returns the org owner's user_id.
 * Otherwise returns the user's own id.
 */
export function useOwnerId() {
  const { user } = useAuth();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetch = async () => {
      // Get profile with org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.org_id) {
        // Get org owner
        const { data: org } = await supabase
          .from('organizations')
          .select('owner_id')
          .eq('id', profile.org_id)
          .maybeSingle();
        
        setOwnerId(org?.owner_id || user.id);
      } else {
        setOwnerId(user.id);
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  return { ownerId, loading };
}
