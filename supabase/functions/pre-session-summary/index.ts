// Supabase Edge Function: resumen pre-sesión con IA (Claude).
// Lee datos NO encriptados del paciente (scores, actividades, correlaciones,
// tareas) — respetando RLS con el JWT del psicólogo — y genera un resumen +
// temas sugeridos con la Messages API de Anthropic.
//
// Deploy:  supabase functions deploy pre-session-summary
// Secreto: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autorizado' }, 401);

    const { patientId } = await req.json();
    if (!patientId) return json({ error: 'Falta patientId' }, 400);

    // Cliente con el JWT del psicólogo → las RLS filtran lo que puede leer.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Datos (RLS-safe). Si el paciente no comparte, estas queries vienen vacías.
    const [{ data: patient }, { data: entries }, { data: activities }, { data: tasks }] = await Promise.all([
      supabase.from('profiles').select('name').eq('id', patientId).maybeSingle(),
      supabase.from('mood_entries').select('date, score').eq('user_id', patientId).order('date', { ascending: false }),
      supabase.from('activities').select('id, name').eq('user_id', patientId),
      supabase.from('tasks').select('description, status').eq('patient_id', patientId),
    ]);

    if (!patient) return json({ error: 'Paciente no encontrado o sin permiso' }, 403);
    const ents = entries ?? [];
    if (ents.length === 0) {
      return json({ resumen: 'Todavía no hay registros de ánimo compartidos para generar un resumen.', temas: [] });
    }

    // Stats
    const last7 = ents.slice(0, 7);
    const avg = (arr: any[]) => arr.length ? (arr.reduce((s, e) => s + e.score, 0) / arr.length) : 0;
    const avg7 = avg(last7).toFixed(1);
    const avg30 = avg(ents.slice(0, 30)).toFixed(1);
    const trend = last7.length >= 2 ? (last7[0].score - last7[last7.length - 1].score) : 0;
    const lowDays = last7.filter((e) => e.score <= 3).length;
    const lastDate = ents[0].date;
    const daysSince = Math.round((Date.now() - new Date(lastDate + 'T12:00:00').getTime()) / 86400000);

    // Correlaciones actividad → ánimo
    const entryIds = ents.map((e: any) => e.id).filter(Boolean);
    let corr: string[] = [];
    if ((activities ?? []).length && entryIds.length) {
      const { data: links } = await supabase.from('entry_activities')
        .select('entry_id, activity_id').in('entry_id', entryIds);
      const overall = avg(ents);
      corr = (activities ?? []).map((a: any) => {
        const ids = (links ?? []).filter((l: any) => l.activity_id === a.id).map((l: any) => l.entry_id);
        const matched = ents.filter((e: any) => ids.includes(e.id));
        if (!matched.length) return null;
        const d = avg(matched) - overall;
        return `${a.name}: ${d >= 0 ? '+' : ''}${d.toFixed(1)} vs promedio (${matched.length} veces)`;
      }).filter(Boolean) as string[];
    }

    const dataBlob = [
      `Paciente: ${patient.name}`,
      `Registros totales: ${ents.length}`,
      `Promedio últimos 7 días: ${avg7}/10`,
      `Promedio últimos 30 días: ${avg30}/10`,
      `Tendencia 7 días: ${trend >= 0 ? '+' : ''}${trend}`,
      `Días con ánimo bajo (≤3) en la última semana: ${lowDays}`,
      `Último registro: hace ${daysSince} día(s)`,
      corr.length ? `Correlaciones actividad→ánimo:\n- ${corr.join('\n- ')}` : 'Sin correlaciones de actividades.',
      (tasks ?? []).length ? `Tareas asignadas: ${(tasks ?? []).map((t: any) => `${t.description} [${t.status}]`).join('; ')}` : 'Sin tareas asignadas.',
    ].join('\n');

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' }, 500);
    const anthropic = new Anthropic({ apiKey });

    const SCHEMA = {
      type: 'object',
      properties: {
        resumen: { type: 'string', description: 'Resumen narrativo de 3-4 oraciones del período, en español rioplatense.' },
        temas: { type: 'array', items: { type: 'string' }, description: '3-4 temas sugeridos para la sesión.' },
      },
      required: ['resumen', 'temas'],
      additionalProperties: false,
    };

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } } as any,
      system:
        'Sos un asistente para psicólogos. A partir de datos cuantitativos de seguimiento ' +
        'del ánimo de un paciente, generás un resumen breve para preparar la sesión. ' +
        'Español rioplatense, tono profesional y cálido. NO diagnostiques ni patologices; ' +
        'describí patrones y sugerí temas de conversación. Basate solo en los datos dados.',
      messages: [{ role: 'user', content: `Datos del paciente:\n\n${dataBlob}\n\nGenerá el resumen pre-sesión y los temas sugeridos.` }],
    });

    const textBlock = msg.content.find((b: any) => b.type === 'text') as any;
    const parsed = JSON.parse(textBlock.text);
    return json({ resumen: parsed.resumen, temas: parsed.temas ?? [] });
  } catch (e: any) {
    return json({ error: e?.message ?? 'Error generando el resumen' }, 500);
  }
});
