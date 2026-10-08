<p align="center">
  <img src="docs/social-preview.png" alt="starpoint · Tu app de Pádel" width="720">
</p>

<p align="center">
  📖 <a href="docs/caso-de-estudio.md"><b>Caso de estudio</b></a>: el problema, las decisiones técnicas y lo que aprendí construyéndola · <a href="docs/case-study.md">in English</a><br>
  🎾 <a href="https://star-point-demo.vercel.app"><b>Demo con datos ficticios</b></a> (jugadores de Los Simpson): pide las cuentas de prueba
</p>

<p align="center">
  <img src="docs/img/02-inicio.png" alt="Inicio: tus eventos y partidos" width="190">
  <img src="docs/img/03-mixing.png" alt="Un mixing: quién viene y apuntarse" width="190">
  <img src="docs/img/04-sorteo.png" alt="El sorteo: tu pista, tu pareja y tus rivales" width="190">
  <img src="docs/img/05-publicar-partido.png" alt="Publicar un partido con comentario" width="190">
</p>

<p align="center">
  <sub>Inicio · Mixing · Sorteo · Publicar partido &nbsp;(demo con datos ficticios)</sub><br>
  ▶ <a href="docs/img/demo.mp4"><b>Recorrido en vídeo</b></a> (67 s) · <img src="docs/img/splash.gif" alt="Animación de entrada" width="70" align="middle">
</p>

# starpoint 🎾

**starpoint** es una PWA para un grupo de pádel: mixings semanales con sorteo de parejas, partidos publicados para buscar jugadores, ranking ELO y validación de resultados. Construida con **Next.js 16**, **Supabase** y **Emotion**, pensada solo para móvil.

---

## ✨ Características

### 🔄 Mixing semanal
- Convocatorias con club, fecha, hora, pistas y rondas; inscripción con lista de espera (titulares y reservas por orden de inscripción).
- **Sorteo** de parejas y rivales para todas las rondas del evento, con un algoritmo que prioriza, por este orden: respetar las exclusiones, no repetir pareja ni pista dentro del evento, igualar el nivel de los partidos y, por último, no repetir lo del evento anterior. Las posiciones drive y revés sirven de desempate.
- El admin elige las pistas del club que se usan ese día (Padel Indoor empieza por Blanca Impresores, Joyería Pósito, Hacienda La Laguna y Estrella Damm), genera (o vuelve a generar) el sorteo, revisa un resumen de reencuentros y avisos, y lo publica de una vez.
- **Con el sorteo ya publicado** el admin puede editar el evento (título, fecha, hora y duración no tocan el sorteo; cambiar pistas, rondas o club lo deshace para generarlo de nuevo), rehacerlo, anularlo y cambiar las parejas de una pista cuando los cuatro jugadores lo deciden. Nada de esto es posible en cuanto hay un resultado.
- La vista del sorteo **sigue el reloj**: cada jugador ve su ronda actual y la pestaña pasa sola a la siguiente. Las tarjetas dicen "Partidos creados" hasta la hora de inicio y "En juego" después.
- La lista de espera se ve en "Así va el grupo" y en las tarjetas ("Completo · 2 en reserva"); los eventos en los que estás apuntado llevan la pill "Apuntado".
- **Cron semanal**: cada miércoles a las 22:00 (hora de España) se crea el evento de la semana siguiente en Padel Indoor, con manejo del cambio de hora verano/invierno.
- Los jugadores ven los cambios en tiempo real, sin recargar.

### ➕ Partidos
Cualquier jugador puede publicar un **partido** (club, fecha, hora y cuántas palas busca, de 1 a 3) para completar sus 4 jugadores y 90 minutos, con un **comentario opcional** ("necesitamos una chica", "buscamos un revés"…). Se avisa al grupo por notificación push, aparece en "Lo que viene" y los demás se apuntan o se borran. Sin sorteo ni resultados.

La pantalla del partido muestra siempre los **4 puestos**: el organizador, los jugadores que ya tiene cerrados fuera de la app (con el nombre que él les ponga), los que se apuntan y las plazas libres. El organizador puede **añadir jugadores de fuera del grupo**, renombrarlos o quitarlos, editar el partido o cancelarlo; desaparece al terminar.

### ⚔️ Resultados y ranking
- Cada jugador ve **solo su partido** del sorteo. El resultado se guarda como **juegos totales** (sin sets).
- Un jugador introduce el marcador, el rival lo confirma o lo corrige ("Hay un error en el marcador"). Si pasan 24 horas sin respuesta se confirma el último marcador; los partidos sin resultado caducan sin puntuar.
- **ELO adaptado a pádel dobles**: K dinámico (nuevos jugadores frente a veteranos), peso del margen del resultado, filtro de disparidad y amortiguación en el extremo superior (parámetros en `src/lib/config.ts`). El cálculo y la actualización de los 4 perfiles, el historial y el estado del partido ocurren en una única transacción de PostgreSQL (`confirm_match_atomic`).
- Historial con estadísticas y partidos coloreados por resultado.
- Los niveles de los demás **solo los ve el admin**: los jugadores ven la mano (revés, drive o ambos) de cada uno.

### 🛠️ Roles
| Rol | Capacidades |
|---|---|
| **Jugador** | Inscribirse a mixings y partidos, publicar partidos, introducir y confirmar resultados, ver su historial |
| **Admin** | Todo lo anterior, más: crear y editar eventos, gestionar participantes e invitados, sorteo, partidos pendientes de todo el grupo, exclusiones y jugadores |

Un admin empieza en la **vista de jugador** y cambia a la de administración desde el menú del avatar (solo los admins tienen ese menú; el resto usa la pestaña Perfil). El registro de usuarios está cerrado: solo existen cuentas creadas por un admin.

### ⚡ Tiempo real y PWA
Supabase Realtime en eventos, partidos e inscripciones; notificaciones push; instalable en pantalla de inicio. Al abrir la app desde cero se ve una **splash** animada (una vez por sesión) y los enlaces compartidos llevan una imagen de marca.

---

## 🏗️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19 |
| Estilos | Emotion (tema claro y oscuro en `src/theme.ts`) |
| Backend / BD | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| Despliegue | Vercel (cron semanal); `pg_cron` de Supabase para el cierre automático |
| Formularios | React Hook Form + Zod v4 |
| Iconos | Lucide React |

---

## 📁 Estructura relevante

```
src/
├── app/                  # Rutas: / · /mixing · /partido · /events/[id] · /history · /profile · /admin/*
│   ├── actions/          # Server Actions (events, matches, mixing-generator, admin-*, users…)
│   └── api/cron/         # create-weekly-event, close-pending-matches
├── components/
│   ├── atoms/            # Button, Input, Avatar, Select, Switch…
│   ├── molecules/        # Header, TabBar, Dialog, PlayerList, CourtCard…
│   └── organisms/        # EventOpenView, EventDrawView, EventGenerator, MatchEventView…
├── lib/                  # rating-logic, mixing-algorithm, confirm-match, event-draw, match-events…
└── theme.ts              # Tokens de diseño
```

Más contexto técnico (reglas de privacidad, base de datos, convenciones y flujo de trabajo) en [AGENT.md](AGENT.md).

---

## 🚀 Instalación local

```bash
# 1. Clonar
git clone https://github.com/amat3/star-point.git
cd star-point

# 2. Instalar dependencias
npm install

# 3. Variables de entorno: crea .env.local con las claves de abajo

# 4. Desarrollo
npm run dev
```

### Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # solo servidor: operaciones de admin y cron
CRON_SECRET=...                       # protege /api/cron/*
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...      # notificaciones push
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:...
TEST_PUSH_USER_IDS=id1,id2            # opcional: quién recibe los avisos de los eventos de prueba
WEEKLY_EVENT_CREATED_BY=id            # opcional: autor del evento semanal (por defecto, el primer admin)
PUSH_DISABLED=true                    # opcional, solo en local: no se envía ninguna notificación
```

### Base de datos
Las migraciones están en la raíz del repositorio (`supabase_*.sql`) y se aplican a mano en Supabase, en el orden de su fecha de creación. Algunas están pendientes de aplicar en producción; consulta [AGENT.md](AGENT.md).

---

## ✅ Tests y CI

- **Vitest** para la lógica pura de mayor riesgo: ELO (`rating-logic.test.ts`), algoritmo de sorteo (`mixing-algorithm.test.ts`) y utilidades de fechas y rondas (`utils.test.ts`).
- `npm run test` (una vez) / `npm run test:watch` (modo watch).
- **GitHub Actions** (`.github/workflows/ci.yml`) ejecuta en cada push a `main` y en cada PR: `tsc --noEmit` → `eslint` → `vitest run` → `next build`.
- Fuera de alcance por ahora: tests E2E y de server actions que hablan con Supabase.

---

## ⚙️ Configuración del sistema de rating

Los parámetros del ELO se centralizan en `src/lib/config.ts`:

```ts
K_PROVISIONAL: 0.40   // K para jugadores con < 10 partidos
K_ESTABLISHED: 0.15   // K para jugadores establecidos
PROVISIONAL_LIMIT: 10 // Partidos para considerarse establecido
DISPARITY_FULL: 1.0   // Gap ≤ 1.0 → partido vale 100%
DISPARITY_ZERO: 2.5   // Gap ≥ 2.5 → partido vale 0%
DAMPENING_START: 4.5  // Desde aquí se reduce la volatilidad
DAMPENING_END: 6.5    // Aquí K queda al 60%
MATCH_WEIGHT: 0.70    // Peso del margen del resultado (subido desde 0.40 en jul-2026)
MIN_RATING: 0
MAX_RATING: 7
INITIAL_RATING: 3.5
```

Un cambio de parámetros puede recalcularse con carácter retroactivo sobre todo el historial con `src/scripts/retroactive-match-weight.ts` (dry-run por defecto).

---

## 📄 Licencia

Código publicado **solo para consulta**, como muestra de portfolio. **Todos los derechos reservados**: no se permite copiarlo, modificarlo ni reutilizarlo sin autorización por escrito. Ver [LICENSE](LICENSE).

Creado con ❤️ para la comunidad de pádel.
