import { useCallback, useEffect, useState } from 'react';
import { getPerformanceKpiSnapshot } from '../utils/performanceKpi';

export function usePerformanceKpi() {
  const [snapshot, setSnapshot] = useState(() => getPerformanceKpiSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(getPerformanceKpiSnapshot());
    window.addEventListener('executive-flow:kpi-update', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('executive-flow:kpi-update', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const refresh = useCallback(() => {
    setSnapshot(getPerformanceKpiSnapshot());
  }, []);

  return { snapshot, refresh };
}
