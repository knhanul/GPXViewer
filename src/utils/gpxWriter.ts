import type { RideRecording } from '../types/recording';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildRecordingFileName(startedAt: number): string {
  const date = new Date(startedAt);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `ride-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}.gpx`;
}

export function buildGpxFromRecording(recording: RideRecording): string {
  const trackPoints = recording.points
    .map((point) => {
      const elevation = point.altitudeM ?? point.elevation ?? null;
      const speed = point.speedMps ?? point.speed ?? null;
      const accuracy = point.accuracyM ?? point.accuracy ?? null;
      const ele = elevation != null ? `\n        <ele>${elevation.toFixed(1)}</ele>` : '';
      const extensions: string[] = [];
      if (speed != null && Number.isFinite(speed)) {
        extensions.push(`          <speed>${speed.toFixed(3)}</speed>`);
      }
      if (accuracy != null && Number.isFinite(accuracy)) {
        extensions.push(`          <accuracy>${Math.round(accuracy)}</accuracy>`);
      }
      const extensionsXml = extensions.length > 0 ? `\n        <extensions>\n${extensions.join('\n')}\n        </extensions>` : '';
      return `      <trkpt lat="${point.lat.toFixed(7)}" lon="${point.lng.toFixed(7)}">${ele}\n        <time>${new Date(point.timestamp).toISOString()}</time>${extensionsXml}\n      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="nuni track" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(recording.name)}</name>
    <time>${new Date(recording.startedAt).toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(recording.name)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

export const rideRecordingToGpxXml = buildGpxFromRecording;
