# Nunis — Mood Tracker & Emotional Wellness App

## Qué es
App de seguimiento del estado de ánimo diaria (web + iOS + Android) para jóvenes adultos (18-35) interesados en bienestar y salud mental. Conecta pacientes con sus psicólogos para sesiones más productivas.

## Tech Stack
- **Frontend:** Expo (React Native) con Expo Router — single codebase para web, iOS, Android
- **Database:** SQLite via expo-sqlite (native) / in-memory con localStorage (web, en `lib/web-db.ts`)
- **Encriptación:** tweetnacl (secretbox simétrica + box asimétrica) — campos sensibles (journal, notas) encriptados E2E
- **Fonts:** Playfair Display (headlines serif) + Outfit (body sans-serif) via @expo-google-fonts
- **Platform-specific files:** `*.web.ts` y `*.native.ts` para database y crypto — Metro resuelve automáticamente
- **Landing:** HTML standalone con Tailwind + vanilla JS en `public/landing/` (desktop: `index.html`, mobile: `mobile.html`)

## Estructura del proyecto
```
app/
  (auth)/          → Login, Register (dark glassmorphism + imagen Unsplash)
  (app)/           → Tabs del paciente (Home, Historial, Journal, Insights, Perfil)
  (psych)/         → Dashboard psicólogo + vista paciente individual
  index.tsx        → Landing (iframe a HTML en web, WebView en native)
components/
  AppContainer.tsx → Wrapper con max-width 480px, scroll, padding para tab bar
constants/
  themes.ts        → 6 temas de personalidad (Calma, Energía, Naturaleza, Atardecer, Océano, Minimal)
  prompts.ts       → 18 prompts de journaling guiado en 6 categorías
lib/
  database.web.ts / database.native.ts → CRUD con fallback web automático
  crypto.web.ts / crypto.native.ts     → SHA-256 + nacl, platform-specific
  auth-context.tsx  → Login/register local, derivación de clave desde password
  theme-context.tsx → Tema dinámico según personalidad del usuario
  seed.ts          → Mock data (agustinbava@nunis.com / marcela@nunis.com, password: 1234)
  web-db.ts        → In-memory DB para web con persistencia en localStorage
  landing-html.ts  → HTML mobile landing como string para WebView nativo
public/landing/    → Landing pages HTML (Stitch) servidas como static assets
landing/           → Copia de trabajo de la landing (editar acá, copiar a public/)
assets/
  nunis-logo.jpg       → Logo oficial (serif italic, "i" = figura humana en purple)
  nunis-logo-white.png → Logo versión white para fondos oscuros
  favicon.png          → Favicon (figura humana purple)
```

## Design System
- **Modo:** Light (backgrounds claros, cards blancas)
- **Primary:** #6C5CE7 (purple)
- **Cards:** #FFFFFF, sin borders, shadow suave (shadowOpacity: 0.05, shadowRadius: 16)
- **Border radius:** 24px cards, 16px inputs/buttons, 9999px pills
- **Headlines:** PlayfairDisplay_700Bold
- **Body:** Outfit_400Regular
- **Labels:** Outfit_600SemiBold
- **Tab bar:** Dark pill (#1c1b1b), centrada, max 400px, sin emojis, solo texto

## Modelo de negocio
- **Pacientes:** Freemium. Gratis: tracking + journaling básico. Premium ($4-5/mes): insights IA, historial ilimitado, compartir con profesional.
- **Psicólogos:** Dashboard GRATIS (barrera de entrada = 0). El valor está en retenerlos con features que les ahorran tiempo y mejoran sus sesiones.
- **Revenue adicional:** Micro-consultas asincrónicas (comisión 10-15%), directorio de profesionales (leads), affiliate marketing.

## Features actuales (implementadas)
- Registro diario de ánimo (score 1-10) con actividades custom y notas encriptadas
- Journaling guiado con 18 prompts en 6 categorías (encriptado E2E)
- Historial con calendario de colores (últimos 35 días)
- Correlaciones actividad → ánimo (qué actividades mejoran/empeoran tu día)
- 6 temas visuales personalizables según personalidad
- Vinculación paciente-psicólogo por código de 6 caracteres
- Dashboard psicólogo: lista de pacientes, alertas, mini timeline, resumen pre-sesión
- Vista detallada de paciente: promedios, tendencia, barras 7 días, correlaciones
- Login/register con roles (paciente/psicólogo)
- Landing page con animaciones (parallax, scroll reveal, counter, floating mockups)
- Feed/Home con contenido (historial, insights, psicólogos recomendados, tips)
- Modal de registro flotante con animación de confirmación
- Emotion selector con rueda de emociones (6 primarias → secundarias → terciarias, códigos cortos)
- Notas por voz (UI con modo texto/voz, transcripción simulada)
- Toggle compartir con psicólogo
- Tareas asignables (psicólogo crea → paciente completa)
- Alertas inteligentes (3+ días bajo, inactividad, caída abrupta)
- Open Graph tags en landing
- Favicon personalizado
- Logo dark + white versions

## Features en roadmap (no implementadas aún)
### Para psicólogos
- Resumen pre-sesión con IA generativa (temas sugeridos para la sesión)
- Alertas inteligentes (3+ días bajo, paciente dejó de registrar)
- Tareas asignables al paciente (ejercicios CBT, journaling dirigido, respiración)
- Notas de sesión por voz (dictar → transcribir → nota clínica estructurada)
- Reportes de progreso PDF mensuales
- Perfil profesional público / directorio
- Micro-consultas asincrónicas (responder journal entries entre sesiones, cobro al paciente)
- Recordatorio automático de pago al paciente (CBU/alias copiable)
- Registro simple de ingresos (cuánto cobró, quién debe, total mensual)
- Gestión de agenda básica (horarios, reserva/cancelación desde la app)

### Para pacientes
- Registro por voz: grabar nota de voz → IA transcribe, detecta actividades/labels, sugiere puntaje 1-10. El usuario revisa y guarda.

## Competencia
- **Daylio** — Líder en mood tracking, no tiene social ni journaling guiado
- **Bearable** — Muy analítico pero complejo y frío, sin social
- **How We Feel** — Yale, gratis, sin actividades custom ni correlaciones
- **Reflectly** — Journaling con IA pero sin tracking de actividades
- **Finch** — Gamificado, sin análisis ni personalización real
- **Reflxon** — Social pero sin profundidad analítica

Ninguna combina tracking + correlaciones + journaling guiado + social + psicólogo.

## Comandos útiles
```bash
cd ~/Documents/nunis
npm run web              # App en http://localhost:8081
npm run ios              # iOS simulator
npm run android          # Android emulator

# Landing standalone (alternativa)
cd landing && python3 -m http.server 3000

# Usuarios de prueba (se crean automáticamente via seed.ts)
# Paciente: agustinbava@nunis.com / 1234
# Psicóloga: marcela@nunis.com / 1234
```

## Convenciones
- Idioma de la UI: Español (argentino)
- No usar emojis
- Contenido centrado en web (max-width 480px en pantallas anchas via AppContainer)
- Auth screens: dark glassmorphism con imagen de fondo
- App screens: light mode, cards con sombra sin borders
- Logo: siempre usar `assets/nunis-logo.jpg`, no texto "nunis"
