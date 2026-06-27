import { useEffect, useState } from 'react';
import { getReels } from '../services/api';

export default function useReels() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReels() {
      const data = await getReels();

      if (data.success) {
        setReels(data.reels);
      }

      setLoading(false);
    }

    loadReels();
  }, []);

  return { reels, loading };
}