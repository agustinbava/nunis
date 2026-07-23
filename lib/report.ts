// Genera un reporte de progreso en PDF (imprimible) a partir de datos NO
// encriptados del paciente. Web: abre el diálogo de impresión (guardar como PDF).
// Native: genera el archivo y lo comparte.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

function scoreColor(s: number): string {
  if (s >= 8) return '#27AE60';
  if (s >= 6) return '#7FB77E';
  if (s >= 5) return '#F1C40F';
  if (s >= 3) return '#E67E22';
  return '#E74C3C';
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}

interface Entry { date: string; score: number }

export function buildReportHtml(
  patient: any,
  entries: Entry[],
  correlations: any[],
  tasks: any[]
): string {
  const name = patient?.name || 'Paciente';
  const now = new Date();
  const period = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const generated = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Ordenar ascendente por fecha y quedarnos con últimos 30
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last30 = sorted.slice(-30);
  const scores = last30.map((e) => e.score);
  const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const worst = scores.length ? Math.min(...scores) : 0;
  const registered = last30.length;

  const bars = last30.map((e) => {
    const h = Math.max(6, (e.score / 10) * 90);
    const d = new Date(e.date + 'T12:00:00').getDate();
    return `<div class="bar-col">
      <div class="bar" style="height:${h}px;background:${scoreColor(e.score)}"></div>
      <div class="bar-lbl">${d}</div>
    </div>`;
  }).join('');

  const corrRows = correlations.slice(0, 6).map((c) => {
    const diff = (c.avg_mood_with - c.avg_mood_overall);
    const sign = diff >= 0 ? '+' : '';
    const col = diff >= 0 ? '#27AE60' : '#E74C3C';
    return `<tr>
      <td>${esc(c.name)}</td>
      <td style="text-align:center">${c.times_used}</td>
      <td style="text-align:center">${c.avg_mood_with.toFixed(1)}</td>
      <td style="text-align:right;color:${col};font-weight:600">${sign}${diff.toFixed(1)}</td>
    </tr>`;
  }).join('');

  const doneTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;

  const trendTxt = trend > 0 ? `Ascendente (+${trend})` : trend < 0 ? `Descendente (${trend})` : 'Estable';
  const trendCol = trend > 0 ? '#27AE60' : trend < 0 ? '#E74C3C' : '#787586';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: Helvetica, Arial, sans-serif; color: #1c1b1b; margin: 0; padding: 40px; }
    .brand { color: #6C5CE7; font-size: 26px; font-weight: 700; letter-spacing: 0.5px; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 24px; margin: 4px 0 2px; }
    .sub { color: #787586; font-size: 13px; }
    .hr { height: 3px; background: #6C5CE7; width: 48px; margin: 14px 0 24px; border-radius: 2px; }
    .metrics { display: flex; gap: 12px; margin-bottom: 28px; }
    .metric { flex: 1; border: 1px solid #ECE9F5; border-radius: 14px; padding: 14px; }
    .metric .k { color: #787586; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
    .metric .v { font-family: Georgia, serif; font-size: 26px; margin-top: 4px; }
    h2 { font-family: Georgia, serif; font-size: 17px; margin: 28px 0 12px; }
    .chart { display: flex; align-items: flex-end; gap: 3px; height: 110px; border-bottom: 1px solid #ECE9F5; padding-bottom: 4px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
    .bar { width: 100%; max-width: 16px; border-radius: 3px 3px 0 0; }
    .bar-lbl { font-size: 8px; color: #999; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; color: #787586; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #ECE9F5; padding: 8px 4px; }
    td { padding: 9px 4px; border-bottom: 1px solid #F2F0F7; }
    .tasks { display: flex; gap: 12px; }
    .task-card { flex: 1; border-radius: 14px; padding: 14px; text-align: center; }
    .task-card .n { font-family: Georgia, serif; font-size: 28px; }
    .footer { margin-top: 40px; color: #A9A6B5; font-size: 11px; text-align: center; border-top: 1px solid #ECE9F5; padding-top: 16px; }
  </style></head><body>
    <div class="brand">nunis</div>
    <h1>Reporte de progreso</h1>
    <div class="sub">${esc(name)} · ${esc(period)}</div>
    <div class="hr"></div>

    <div class="metrics">
      <div class="metric"><div class="k">Promedio</div><div class="v">${avg.toFixed(1)}<span style="font-size:14px;color:#787586">/10</span></div></div>
      <div class="metric"><div class="k">Tendencia</div><div class="v" style="font-size:16px;color:${trendCol};padding-top:8px">${trendTxt}</div></div>
      <div class="metric"><div class="k">Días registrados</div><div class="v">${registered}</div></div>
      <div class="metric"><div class="k">Mejor / Peor</div><div class="v" style="font-size:20px;padding-top:4px">${best} / ${worst}</div></div>
    </div>

    <h2>Ánimo diario (últimos ${registered} registros)</h2>
    <div class="chart">${bars || '<div class="sub">Sin registros en el período.</div>'}</div>

    ${corrRows ? `<h2>Qué mueve su ánimo</h2>
    <table><thead><tr><th>Actividad</th><th style="text-align:center">Veces</th><th style="text-align:center">Prom.</th><th style="text-align:right">vs promedio</th></tr></thead>
    <tbody>${corrRows}</tbody></table>` : ''}

    <h2>Tareas</h2>
    <div class="tasks">
      <div class="task-card" style="background:#E8F5E9"><div class="n" style="color:#27AE60">${doneTasks}</div><div class="sub">Completadas</div></div>
      <div class="task-card" style="background:#F7F5FF"><div class="n" style="color:#6C5CE7">${pendingTasks}</div><div class="sub">Pendientes</div></div>
    </div>

    <div class="footer">Generado por Nunis el ${esc(generated)} · Datos de seguimiento del ánimo. No reemplaza el criterio clínico profesional.</div>
  </body></html>`;
}

export async function generatePatientReport(
  patient: any, entries: Entry[], correlations: any[], tasks: any[]
): Promise<void> {
  const html = buildReportHtml(patient, entries, correlations, tasks);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
  } else {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    }
  }
}
