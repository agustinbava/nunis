# Nunis — Deploy en Supabase + hosting web

Todo el código ya está migrado a Supabase (Postgres + Auth + RLS). Faltan solo
tus pasos manuales. Seguí en orden.

## 1. Crear el schema en Supabase
1. Supabase Dashboard → tu proyecto → **SQL Editor** → New query.
2. Pegá el contenido completo de [`supabase/schema.sql`](supabase/schema.sql) y **Run**.
3. Verificá en **Table Editor** que aparezcan las 7 tablas (`profiles`, `activities`,
   `mood_entries`, `entry_activities`, `journal_entries`, `psych_patients`, `tasks`).

## 2. Desactivar la confirmación por email (para el prototipo)
Sin esto, el registro no deja entrar hasta confirmar el mail y se rompe el flujo del demo.
- **Authentication → Providers → Email** (o **Authentication → Sign In / Providers**)
  → desactivá **"Confirm email"** → Save.
- (Más adelante, en producción, conviene volver a activarlo.)

## 3. Cargar las claves de la API en el proyecto
1. Supabase → **Project Settings → API**.
   - Copiá **Project URL** → va en `EXPO_PUBLIC_SUPABASE_URL`.
   - Copiá la **anon / public key** → va en `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   - (La anon key es segura de exponer en el cliente **porque el schema tiene RLS activado**.
     Nunca uses la `service_role` key en la app.)
2. Editá el archivo [`.env`](.env) en la raíz del proyecto y completá esos dos valores.

## 4. Probar local
```bash
cd ~/Documents/nunis
npm run web
```
- Abrí http://localhost:8081, andá a **Crear cuenta** y registrá un usuario.
- Si ves un warning de "Falta configurar EXPO_PUBLIC_SUPABASE_..." en la consola,
  el `.env` no se cargó: reiniciá el server de Expo.

## 5. Datos de demo (opcional)
El seed viejo (`lib/seed.ts`) ya no corre solo porque los usuarios ahora se crean
vía Supabase Auth. Para tener data de demo, registrá a mano desde la app:
- Paciente: `agustinbava@nunis.com` / (password que elijas)
- Psicóloga: `marcela@nunis.com` / (password que elijas)
- Logueá como paciente → Perfil → copiá tu **código de vinculación**.
- Logueá como psicóloga → vinculá al paciente con ese código.
- Cargá algunos registros de ánimo desde la app para poblar el dashboard.

## 5b. Resumen pre-sesión con IA (Edge Function + Claude)

La vista de paciente del psicólogo tiene un botón **"Generar resumen con IA"** que
llama a una Supabase Edge Function ([supabase/functions/pre-session-summary](supabase/functions/pre-session-summary/index.ts)),
la cual usa Claude para resumir los datos (scores, actividades, correlaciones, tareas — nada encriptado)
y sugerir temas de sesión. La API key queda del lado servidor.

Pasos para activarlo:
1. Instalá la CLI de Supabase (si no la tenés): `brew install supabase/tap/supabase`
2. Login y link al proyecto:
```bash
supabase login
supabase link --project-ref tqimrllinxdjhljuwxor
```
3. Cargá tu API key de Anthropic como secreto (console.anthropic.com → API Keys):
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
4. Deploy de la función:
```bash
supabase functions deploy pre-session-summary
```

Sin este paso, el botón muestra un error pidiéndote que despliegues la función.
El resto de la app funciona igual.

## 5c. Mensajería + directorio de profesionales

Para habilitar los mensajes psicólogo→paciente (con popup al loguearse y broadcast/multiselect)
y el directorio de profesionales con perfil:

1. En el **SQL Editor** de Supabase, pegá y corré [`supabase/features.sql`](supabase/features.sql).
   Es **additivo** (no borra nada): crea las tablas `messages` y `professionals` con sus RLS
   y seedea 5 profesionales para el directorio.
2. (Opcional) Para ver datos de demo de mensajes al instante:
```bash
cd ~/Documents/nunis && node scripts/seed-messages.mjs
```
Esto hace que Marcela mande un mensaje de bienvenida a Agustín y una recomendación de libro
(broadcast) a todos sus pacientes. Es idempotente (no duplica si ya hay mensajes).

Sin el paso 1, la app funciona igual pero la sección de mensajes y el directorio salen vacíos.

## 5d. Registro de ingresos del psicólogo

Para el ledger de ingresos en el dashboard (botón "Ingresos"):
1. En el **SQL Editor**, corré [`supabase/income.sql`](supabase/income.sql) (additivo, crea la tabla `session_income` con RLS).
2. (Opcional) datos de demo:
```bash
cd ~/Documents/nunis && node scripts/seed-income.mjs
```

## 5e. Notas de sesión del psicólogo

Para las notas clínicas privadas por paciente (pestaña "Notas" en la vista de paciente):
- En el **SQL Editor**, corré [`supabase/notes.sql`](supabase/notes.sql) (additivo, tabla `session_notes` con RLS: solo el psicólogo dueño la ve).

## 5f. Agenda / turnos

Para que el psicólogo publique horarios y el paciente reserve (botón "Agenda" en el
dashboard, "Ver turnos" en el perfil del paciente):
- En el **SQL Editor**, corré [`supabase/agenda.sql`](supabase/agenda.sql) (additivo, tabla `appointments` con RLS del flujo de reserva).

## 5g. Micro-consultas asincrónicas

Para que el paciente haga consultas puntuales y el psicólogo responda (botón
"Consultar entre sesiones" en el perfil del paciente, "Consultas" en el dashboard):
- En el **SQL Editor**, corré [`supabase/consultations.sql`](supabase/consultations.sql) (additivo, tabla `consultations` con RLS).

## 6. Deploy web (Vercel — recomendado)
1. Subí el repo a GitHub (si no está actualizado).
2. En [vercel.com](https://vercel.com) → **Add New Project** → importá el repo.
3. Vercel detecta `vercel.json` (build: `npx expo export --platform web`, output: `dist`).
4. En **Settings → Environment Variables** agregá las mismas dos:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. **Deploy**. Te queda una URL pública tipo `nunis.vercel.app`.

> Alternativa sin GitHub: `npm i -g vercel && npx expo export --platform web && vercel deploy dist --prod`

## 7. (Opcional) Deploy mobile
El código nativo (iOS/Android) también quedó apuntando a Supabase. Para builds:
`npx eas build` (requiere cuenta Expo EAS). No es necesario para el pitch web.

---

## Qué hice yo (ya está en el código)
- `supabase/schema.sql` — tablas Postgres, índices, triggers y **todas las policies de RLS**
  (cada usuario ve solo su data; el psicólogo ve la del paciente **según los flags `share_*`**).
- `lib/supabase.ts` — cliente Supabase (sesión persistida, funciona web + native).
- `lib/database.supabase.ts` — reimplementación de las ~24 funciones de datos contra Supabase.
  `database.web.ts` / `database.native.ts` ahora re-exportan de acá (las pantallas no cambiaron).
- `lib/auth-context.tsx` — auth real con **Supabase Auth** (signUp / signIn / sesión persistida).
- `.env` / `.env.example` — config de las keys (y `.env` va al `.gitignore`).
- `vercel.json` — build y ruteo SPA para el deploy web.
- Dependencias: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`,
  `react-native-url-polyfill` y `@opentelemetry/api` (esta última solo para que Metro
  resuelva un import dinámico de supabase-js; sin ella el build web falla).
- Verificado: `npx expo export --platform web` compila y genera `dist/` sin errores.

## Decisiones / caveats importantes
- **Encriptación E2E mantenida**: notas y journal siguen encriptándose en el cliente con la
  clave derivada del password. Ventaja: aunque el psicólogo tenga permiso de leer la fila,
  esos campos son ilegibles sin la clave del paciente.
- **Reset de password = se pierden los campos encriptados** de ese usuario (la clave se deriva
  del password). Aceptable para el prototipo; para producción hay que sumar recovery keys.
- **Al restaurar sesión** (recargar la página sin re-loguear) los campos encriptados quedan
  bloqueados hasta el próximo login, porque la clave vive solo en memoria. El resto de la data
  (scores, actividades, tareas) se ve normal.
