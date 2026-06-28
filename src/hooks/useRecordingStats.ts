import { useEffect, useMemo, useState } from 'react';
import type { RecordingStatus, RideRecorderSession } from '../types/recording';
import { buildRecordingStats } from '../utils/recordingStats';

export function useRecordingStats(
  session: RideRecorderSession | null,
  status: RecordingStatus
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!session) return;
    if (status !== 'starting' && status !== 'recording' && status !== 'paused' && status !== 'stopping') {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.id, status]);

  return useMemo(() => buildRecordingStats(session, status, now), [session, status, now]);
}
