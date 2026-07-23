// Racha (streak) y logros, computados de los datos existentes. Sin DB nueva.

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;      // nombre de Ionicons
  goal: number;
  progress: number;  // acotado a goal
  unlocked: boolean;
}

function dayStr(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().split('T')[0];
}

function bestStreak(dates: string[]): number {
  const uniq = [...new Set(dates)].sort();
  if (!uniq.length) return 0;
  let best = 1, run = 1;
  for (let i = 1; i < uniq.length; i++) {
    const diff = Math.round(
      (Date.parse(uniq[i] + 'T00:00:00Z') - Date.parse(uniq[i - 1] + 'T00:00:00Z')) / 86400000
    );
    if (diff === 1) run++;
    else if (diff > 1) run = 1;
    best = Math.max(best, run);
  }
  return best;
}

export function computeStreak(dates: string[]): { current: number; best: number } {
  const set = new Set(dates);
  const best = bestStreak(dates);
  let start = 0;
  if (!set.has(dayStr(0))) {
    if (set.has(dayStr(-1))) start = -1;
    else return { current: 0, best };
  }
  let current = 0, off = start;
  while (set.has(dayStr(off))) { current++; off--; }
  return { current, best: Math.max(current, best) };
}

export function computeAchievements(
  entryCount: number, streak: number, journalCount: number
): Achievement[] {
  const defs = [
    { id: 'first',    title: 'Primer paso',    desc: 'Tu primer registro',       goal: 1,  val: entryCount,   icon: 'footsteps-outline' },
    { id: 'streak3',  title: 'En marcha',      desc: '3 días seguidos',          goal: 3,  val: streak,       icon: 'flame-outline' },
    { id: 'e10',      title: 'Explorador',     desc: '10 registros',             goal: 10, val: entryCount,   icon: 'compass-outline' },
    { id: 'journal1', title: 'Reflexivo',      desc: 'Tu primer journal',        goal: 1,  val: journalCount, icon: 'book-outline' },
    { id: 'streak7',  title: 'Semana firme',   desc: '7 días seguidos',          goal: 7,  val: streak,       icon: 'flame' },
    { id: 'e30',      title: 'Dedicado',       desc: '30 registros',             goal: 30, val: entryCount,   icon: 'ribbon-outline' },
    { id: 'journal5', title: 'Escritor',       desc: '5 entradas de journal',    goal: 5,  val: journalCount, icon: 'create-outline' },
    { id: 'streak30', title: 'Mes constante',  desc: '30 días seguidos',         goal: 30, val: streak,       icon: 'trophy-outline' },
  ];
  return defs.map((d) => ({
    id: d.id, title: d.title, desc: d.desc, icon: d.icon, goal: d.goal,
    progress: Math.min(d.val, d.goal), unlocked: d.val >= d.goal,
  }));
}
