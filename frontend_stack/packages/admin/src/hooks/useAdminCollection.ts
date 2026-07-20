import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, listFromPayload } from '@beonedge/client/services/_util';

// Per-collection loading for redesigned pages: each page fetches only the
// data it shows, with a stale-response guard for fast navigation.

export default function useAdminCollection(path) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reqRef = useRef(0);

  const reload = useCallback(async () => {
    const reqId = ++reqRef.current;
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest(path, { scope: 'admin' });
      if (reqId !== reqRef.current) return;
      setItems(listFromPayload(payload));
      setLoading(false);
    } catch (requestError) {
      if (reqId !== reqRef.current) return;
      setError(requestError?.message || 'Could not load data.');
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, error, reload };
}
