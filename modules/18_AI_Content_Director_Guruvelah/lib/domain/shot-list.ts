export interface ShotListItem {
  shotNumber: number;
  timeRange: string;
  phase: string;
  visualDescription: string;
  cameraFraming: string;
  bRollSuggestion: string;
  onScreenText: string;
}

export function deriveShotList(script: any): ShotListItem[] {
  if (!script || script.kind !== 'video' || !Array.isArray(script.segments)) {
    return [];
  }

  return script.segments.map((seg: any, idx: number) => ({
    shotNumber: idx + 1,
    timeRange: `${seg.startSec}–${seg.endSec}s`,
    phase: seg.label || 'SCENE',
    visualDescription: seg.visual || 'Talking head speaker on camera.',
    cameraFraming: seg.camera || 'Medium Close Up (MCU), Eye-Level',
    bRollSuggestion: seg.bRoll || 'N/A',
    onScreenText: seg.onScreenText || '',
  }));
}
