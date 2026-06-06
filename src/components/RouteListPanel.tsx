import { useState } from 'react';
import { Eye, EyeOff, Trash2, MapPin, Check } from 'lucide-react';
import type { RouteId, RouteState } from '../types/gpx';
import { ROUTE_COLOR_PALETTE } from '../utils/segmentUtils';

interface RouteListPanelProps {
  routes: RouteState[];
  activeRouteId: RouteId | null;
  onActivate: (id: RouteId) => void;
  onToggleVisible: (id: RouteId) => void;
  onRemove: (id: RouteId) => void;
  onRename: (id: RouteId, name: string) => void;
  onRecolor: (id: RouteId, color: string) => void;
  onFitAll: () => void;
}

/**
 * 경로 목록 패널.
 * - 활성 경로 선택, 색상 변경, 표시/숨김, 이름 변경, 삭제
 * - "전체 보기" 버튼
 */
export function RouteListPanel({
  routes,
  activeRouteId,
  onActivate,
  onToggleVisible,
  onRemove,
  onRename,
  onRecolor,
  onFitAll
}: RouteListPanelProps) {
  const [editingId, setEditingId] = useState<RouteId | null>(null);
  const [editingValue, setEditingValue] = useState('');

  if (routes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-ink-700/40 p-4 text-xs text-zinc-500">
        업로드된 경로가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="font-display text-xs font-semibold uppercase tracking-wider text-zinc-300">
          경로 ({routes.length})
        </p>
        <button
          type="button"
          onClick={onFitAll}
          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-700/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition hover:bg-ink-700"
        >
          <MapPin className="h-3 w-3" /> 전체 보기
        </button>
      </div>
      <ul className="space-y-1.5">
        {routes.map((s) => {
          const active = s.id === activeRouteId;
          return (
            <li
              key={s.id}
              className={[
                'group flex flex-col gap-1.5 rounded-xl border px-2.5 py-2 transition',
                active
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-white/5 bg-ink-900/40 hover:border-white/15'
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                {/* 색상 칩 + 선택 */}
                <button
                  type="button"
                  onClick={() => onActivate(s.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10"
                  style={{ background: s.color }}
                  title="활성 경로로 지정"
                  aria-label="활성 경로로 지정"
                >
                  {active ? (
                    <Check className="h-3.5 w-3.5 text-ink-900" />
                  ) : null}
                </button>

                {editingId === s.id ? (
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={() => {
                      if (editingValue.trim()) {
                        onRename(s.id, editingValue.trim());
                      }
                      setEditingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingValue.trim()) {
                          onRename(s.id, editingValue.trim());
                        }
                        setEditingId(null);
                      } else if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md border border-white/10 bg-ink-900 px-2 py-0.5 text-xs text-zinc-100 outline-none focus:border-accent/60"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(s.id);
                      setEditingValue(s.name);
                    }}
                    onDoubleClick={() => {
                      setEditingId(s.id);
                      setEditingValue(s.name);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-zinc-100"
                    title="더블클릭 / 탭하여 이름 변경"
                  >
                    {s.name}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onToggleVisible(s.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 transition hover:bg-white/5"
                  title={s.visible ? '숨기기' : '표시'}
                  aria-label={s.visible ? '숨기기' : '표시'}
                >
                  {s.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-zinc-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`"${s.name}" 을(를) 삭제할까요?`)) {
                      onRemove(s.id);
                    }
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 transition hover:bg-rose-500/15 hover:text-rose-300"
                  title="삭제"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 pl-1">
                <span className="font-mono text-[10px] text-zinc-500">
                  {s.route.totalDistanceKm.toFixed(2)} km · +{Math.round(s.route.totalElevationGain)}m
                </span>
              </div>
              {/* 색상 팔레트 */}
              <div className="flex items-center gap-1 pl-1">
                {ROUTE_COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onRecolor(s.id, c)}
                    className={[
                      'h-4 w-4 rounded-full border transition hover:scale-110',
                      s.color === c
                        ? 'border-white/80 ring-1 ring-white/30'
                        : 'border-white/10'
                    ].join(' ')}
                    style={{ background: c }}
                    aria-label={`색상 ${c}`}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
