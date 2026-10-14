/**
 * دوال مساعدة لإدارة مباريات وبطولات الدوري
 * تدعم تشفير وفك تشفير الجولة ومرحلة الذهاب/الإياب
 * لضمان الحفظ الدائم في السحابة حتى قبل إضافة الأعمدة الجديدة
 */

export function encodeMatchPitch(pitch?: string, round?: number, leg?: string): string {
  const cleanPitch = (pitch || '').replace(/^\[R:\d+\|L:[^\]]+\]\s*/, '').trim();
  const r = round || 1;
  const l = leg || 'ذهاب';
  return `[R:${r}|L:${l}] ${cleanPitch}`.trim();
}

export function decodeMatchPitch(pitch?: string): { displayPitch: string; round: number; leg: 'ذهاب' | 'إياب' } {
  if (!pitch) return { displayPitch: '', round: 1, leg: 'ذهاب' };
  const match = pitch.match(/^\[R:(\d+)\|L:(ذهاب|إياب)\]\s*(.*)$/);
  if (match) {
    return {
      round: parseInt(match[1]) || 1,
      leg: match[2] as 'ذهاب' | 'إياب',
      displayPitch: match[3] || ''
    };
  }
  return { displayPitch: pitch, round: 1, leg: 'ذهاب' };
}
