import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { RecordingMeta, RideRecording } from '../types/recording';
import {
  deleteRecording,
  getRecordingById,
  getRecordingMetas,
  saveRecording,
  updateRecordingMeta
} from '../utils/recordingStorage';

interface UseSavedRecordingsResult {
  metas: RecordingMeta[];
  selectedRecording: RideRecording | null;
  selectedMeta: RecordingMeta | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (recording: RideRecording) => Promise<RecordingMeta>;
  select: (id: string) => Promise<RideRecording | null>;
  clearSelection: () => void;
  remove: (id: string) => Promise<void>;
  updateMeta: (meta: RecordingMeta) => Promise<void>;
  setSelectedRecording: Dispatch<SetStateAction<RideRecording | null>>;
}

export function useSavedRecordings(): UseSavedRecordingsResult {
  const [metas, setMetas] = useState<RecordingMeta[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<RideRecording | null>(null);
  const [selectedMetaId, setSelectedMetaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMeta = useMemo(
    () => metas.find((meta) => meta.id === selectedMetaId) ?? null,
    [metas, selectedMetaId]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextMetas = await getRecordingMetas();
      setMetas(nextMetas);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '저장된 기록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (recording: RideRecording) => {
    try {
      const meta = await saveRecording(recording);
      setMetas((prev) => {
        const next = prev.filter((item) => item.id !== meta.id);
        next.unshift(meta);
        return next;
      });
      setError(null);
      return meta;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '기록을 저장하지 못했습니다.';
      setError(message);
      throw saveError;
    }
  }, []);

  const select = useCallback(async (id: string) => {
    setSelectedMetaId(id);
    setDetailLoading(true);
    try {
      const recording = await getRecordingById(id);
      setSelectedRecording(recording);
      if (!recording) {
        setError('선택한 기록의 원본 데이터를 찾지 못했습니다.');
      } else {
        setError(null);
      }
      return recording;
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : '기록 상세를 불러오지 못했습니다.');
      setSelectedRecording(null);
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMetaId(null);
    setSelectedRecording(null);
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteRecording(id);
    setMetas((prev) => prev.filter((meta) => meta.id !== id));
    setSelectedMetaId((prev) => (prev === id ? null : prev));
    setSelectedRecording((prev) => (prev?.id === id ? null : prev));
  }, []);

  const updateMeta = useCallback(async (meta: RecordingMeta) => {
    await updateRecordingMeta(meta);
    setMetas((prev) => {
      const next = prev.filter((item) => item.id !== meta.id);
      next.unshift(meta);
      return next;
    });
  }, []);

  return {
    metas,
    selectedRecording,
    selectedMeta,
    loading,
    detailLoading,
    error,
    refresh,
    save,
    select,
    clearSelection,
    remove,
    updateMeta,
    setSelectedRecording
  };
}
