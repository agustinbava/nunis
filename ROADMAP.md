# Nunis — Roadmap hacia la presentación

## Completado
- Emotion selector con rueda de emociones (3 niveles → 2 niveles)
- Feed/Home con modal de registro flotante
- Animación de confirmación post-registro
- Open Graph meta tags
- Logo con versiones dark/light
- Favicon personalizado
- Landing page con animaciones (parallax, scroll reveal, water ripples, zoom)
- Tareas asignables (psicólogo → paciente, full stack)
- Alertas inteligentes mejoradas (3 tipos de detección)
- Notas por voz (UI lista, transcripción simulada)
- Toggle compartir con psicólogo
- Roles: Miembro / Profesional

---

## Estado actual
- Prototipo funcional (web + mobile) con Expo
- Login, registro, mood tracking, journaling, insights, perfil, dashboard psicólogo
- Landing page con animaciones (Stitch)
- Encriptación E2E implementada
- Mock data con usuario de prueba
- Repo en GitHub

## Problemas conocidos
- UI desalineada, no matchea los diseños de Stitch en varias pantallas
- Colores y spacing inconsistentes entre pantallas
- Features core del roadmap sin implementar
- Sin hosting (solo local)
- Sin tests
- Sin pitch deck / presentación

---

## FASE 1 — Pulir la UI (hacer que se vea bien para demos)
**Objetivo:** Que alguien pueda abrir la app y decir "esto se ve profesional".
**Tiempo estimado:** 3-5 días

- [x] **1.1 Alinear todas las pantallas con el design system de Stitch**
  - Revisar cada pantalla contra los screenshots de Stitch (están en `stitch_output/`)
  - Aplicar spacing consistente (8px grid, 24px margins, 32px entre secciones)
  - Cards: blancas, sin border, shadow suave, borderRadius 24
  - Tipografía: Playfair Display headlines, Outfit body, tamaños correctos
  - Colores: usar la paleta de `constants/themes.ts` consistentemente

- [x] **1.2 Responsive / max-width**
  - Verificar que AppContainer centra bien el contenido en todas las pantallas
  - Tab bar centrada y con ancho correcto
  - Login/register centrados en desktop

- [x] **1.3 Pulir la landing**
  - Verificar que los CTAs funcionan (Comenzar → register, login)
  - Logo local cargando correctamente
  - Mobile landing funcional

- [x] **1.4 Favicon y metadata**
  - Crear favicon real desde el logo
  - Title y meta description correctos
  - Open Graph tags para compartir en redes

---

## FASE 2 — Features diferenciadores (lo que te hace único en un pitch)
**Objetivo:** Tener 2-3 features "wow" que ningún competidor tiene.
**Tiempo estimado:** 1-2 semanas

- [x] **2.1 Registro por voz (paciente)** *(parcial - UI lista, falta Whisper API)*
  - Grabar nota de voz desde la pantalla Home
  - Transcribir con IA (Whisper API o similar)
  - Detectar actividades/labels mencionadas y seleccionarlas automáticamente
  - Sugerir puntaje 1-10 basado en el sentimiento
  - El usuario revisa, ajusta y guarda
  - *Esto es el "wow" más grande para un demo*

- [ ] **2.2 Resumen pre-sesión con IA (psicólogo)**
  - Generar un resumen semanal automático del paciente
  - "Agustín tuvo una semana mixta (promedio 5.8). Los días que corrió mejoró +2..."
  - Temas sugeridos para la sesión
  - Usar OpenAI/Claude API para generar el texto
  - Mostrar en la vista de paciente del dashboard

- [x] **2.3 Tareas asignables (psicólogo → paciente)**
  - El psicólogo puede crear tareas: "Registrá tu ánimo 2x/día", "Escribí sobre X"
  - El paciente las ve en su Home como pendientes
  - Estado: pendiente / completada
  - DB: nueva tabla `tasks`

- [x] **2.4 Alertas inteligentes (psicólogo)**
  - Notificación cuando paciente tiene 3+ días con ánimo ≤ 3
  - Alerta si dejó de registrar por 3+ días
  - Mostrar en el dashboard como badges/banners

---

## FASE 3 — Hosting (que cualquiera pueda probarlo)
**Objetivo:** URL pública para compartir con testers y para el pitch.
**Tiempo estimado:** 1-2 días

- [ ] **3.1 Elegir hosting**
  - Opción A: **Vercel** (gratis, deploy automático desde GitHub, ideal para web)
  - Opción B: **Railway** (si necesitás backend en el futuro)
  - Opción C: **Expo EAS** (para builds nativos iOS/Android)

- [ ] **3.2 Deploy web**
  - Configurar `npx expo export --platform web` como build command
  - Configurar dominio (nunis.app o similar si está disponible)
  - Integrar la landing como página principal

- [ ] **3.3 Deploy mobile (opcional para el pitch)**
  - Configurar EAS Build para generar APK/IPA
  - Publicar en TestFlight (iOS) y/o generar link de descarga directa (Android)
  - O usar Expo Go para demos en vivo

---

## FASE 4 — Backend real (reemplazar SQLite local)
**Objetivo:** Que la data persista en un servidor y funcione multi-dispositivo.
**Tiempo estimado:** 1-2 semanas

- [ ] **4.1 Migrar a Supabase (o similar)**
  - Crear proyecto en Supabase
  - Migrar schema SQLite a PostgreSQL
  - Implementar auth con Supabase Auth (reemplaza auth local)
  - Row Level Security para que cada usuario solo vea sus datos

- [ ] **4.2 API para features de IA**
  - Endpoint para transcripción de voz
  - Endpoint para resumen pre-sesión
  - Endpoint para sugerencia de puntaje

- [ ] **4.3 Mantener encriptación E2E**
  - Los campos sensibles siguen encriptándose en el cliente
  - El servidor almacena datos encriptados sin poder leerlos
  - Key management con Supabase Vault o similar

---

## FASE 5 — Tests (estabilidad antes de salir al mercado)
**Objetivo:** Confianza de que nada se rompe al agregar features.
**Tiempo estimado:** 3-5 días

- [ ] **5.1 Tests unitarios**
  - Encriptación/desencriptación (crypto.ts)
  - Funciones de correlación
  - Lógica de seed data
  - Validaciones de auth

- [ ] **5.2 Tests de integración**
  - Flujo completo: registro → crear actividades → mood entry → ver historial
  - Flujo psicólogo: registro → ver dashboard → ver paciente
  - Vinculación paciente-psicólogo

- [ ] **5.3 Tests E2E (opcional)**
  - Cypress o Playwright para web
  - Detox para mobile (si hay tiempo)

---

## FASE 6 — Presentación / Pitch
**Objetivo:** Material listo para presentar a inversores, aceleradoras, o primeros usuarios.
**Tiempo estimado:** 3-5 días

- [ ] **6.1 Pitch deck (10-12 slides)**
  1. Problema (las sesiones pierden 15 min en recap, los pacientes olvidan lo importante)
  2. Solución (Nunis: mood tracking + journaling + conexión con terapeuta)
  3. Demo / screenshots de la app
  4. Diferenciadores (voz, IA, encriptación, personalización)
  5. Mercado ($6B mental health apps, 13% CAGR)
  6. Modelo de negocio (freemium paciente + herramienta gratis psicólogo)
  7. Competencia y por qué Nunis gana
  8. Tracción (si ya tenés early users o feedback)
  9. Equipo
  10. Ask (qué necesitás: inversión, mentores, early adopters)

- [ ] **6.2 Video demo (2-3 minutos)**
  - Grabación de pantalla mostrando el flujo completo
  - Paciente registra su día (con voz si está implementado)
  - Psicólogo ve el resumen pre-sesión
  - Narración en off o subtítulos

- [ ] **6.3 Landing page final**
  - Pulir copy y CTAs
  - Agregar sección de "early access" con formulario de email
  - Testimonios (pueden ser de los primeros testers)

- [ ] **6.4 Validación con usuarios reales**
  - Conseguir 5-10 personas que la usen 1 semana
  - Conseguir 2-3 psicólogos que prueben el dashboard
  - Recopilar feedback cualitativo
  - Iterar antes del pitch

---

## Orden de prioridad sugerido

```
AHORA          SEMANA 1-2       SEMANA 3        SEMANA 4         SEMANA 5+
─────          ──────────       ────────        ────────         ─────────
Fase 1         Fase 2           Fase 3          Fase 5           Fase 6
(UI polish)    (Features        (Hosting)       (Tests)          (Pitch)
               wow: voz,                                         
               IA, tareas)      Fase 4                           
                                (Backend                         
                                si es necesario)                 
```

**Nota:** La Fase 4 (backend real) se puede postergar si el pitch es solo un demo.
Si el pitch requiere que múltiples personas usen la app al mismo tiempo,
entonces Fase 4 va antes de Fase 6. Si es un demo controlado, alcanza con
el SQLite local + hosting estático.

---

## Quick wins para impresionar en un demo
Si tenés poco tiempo y necesitás impactar rápido, priorizá:
1. **UI pulida** (que se vea pro) — Fase 1
2. **Registro por voz** (factor wow) — Fase 2.1
3. **Hosting** (que el otro lo pueda probar) — Fase 3
4. **Video demo** (para mandar por WhatsApp/email) — Fase 6.2

Con esas 4 cosas tenés suficiente para una primera presentación convincente.
