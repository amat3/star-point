# StarPoint 🎾

**StarPoint** es una PWA para gestionar mixings de pádel: convocatorias, emparejamientos automáticos, ranking ELO y validación de resultados. Construida con **Next.js 16**, **Supabase** y **Tailwind CSS v4**.

---

## ✨ Características

### 🔄 Mixing automatizado
- Convocatorias con fecha, hora, pistas y número de rondas
- Algoritmo de emparejamiento con tres estrategias: **niveles similares**, **Pro-Am** (mejor + peor de cada pista) y variante **abierta**
- Evitación de repetición de compañeros y rivales entre rondas
- Priorización de parejas Drive + Revés
- Lista de espera automática (titulares vs. reservas por orden de inscripción)
- Guardado atómico de todas las rondas en una sola operación de BD
- Los jugadores ven los cambios en tiempo real sin recargar la página
- **Cron automático**: cada miércoles a las 22:00 (hora España) se crea la convocatoria de la semana siguiente vía Vercel Cron, con manejo correcto de cambio de hora verano/invierno

### 🏆 Ranking ELO adaptado a pádel dobles
- **K-factor dinámico**: `K=0.40` para nuevos jugadores (< 10 partidos), `K=0.15` para veteranos
- **Multiplicador de intensidad**: el margen del resultado pondera el cambio de nivel
- **Filtro de disparidad**: partidos desequilibrados (>2.5 puntos de diferencia entre equipos) no afectan al ranking
- **Amortiguación en el extremo superior**: la volatilidad se reduce progresivamente a partir de nivel 4.5
- Actualización atómica de los 4 perfiles + historial + estado del partido en una única transacción PostgreSQL (RPC `confirm_match_atomic`)
- Solo los partidos de tipo **mixing** puntúan

### ⚔️ Validación de partidos
- Un partido requiere confirmación antes de aplicar ELO
- Protección contra doble confirmación concurrente (`FOR UPDATE` lock en la transacción)
- Mecanismo de impugnación para resultados incorrectos
- Historial paginado con filtros

### 🔒 Seguridad
- **Row Level Security** habilitado en `profiles` y `rating_history`
- La función `confirm_match_atomic` usa `SECURITY DEFINER` y bloquea filas atómicamente
- Todas las operaciones destructivas verifican el rol de admin en BD
- Políticas RLS mínimas: SELECT público en perfiles, UPDATE solo del propio perfil

### ⚡ Tiempo real
- **Supabase Realtime** habilitado en `events`, `matches` y `event_participants`
- El componente `RealtimeRefresher` detecta cambios en BD y llama a `router.refresh()` automáticamente
- Los players ven nuevas convocatorias, inscripciones, rondas generadas y resultados sin recargar

### 🛠️ Roles
| Rol | Capacidades |
|---|---|
| **Jugador** | Inscribirse a mixings, validar partidos, ver historial y ranking |
| **Admin** | Todo lo anterior + crear/editar/eliminar eventos, generar rondas de mixing, gestionar participantes, añadir invitados para completar eventos, vista de ranking completo |

> El registro de nuevos usuarios es solo por invitación (gestión vía admin).

---

## 🏗️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19 |
| Estilos | Tailwind CSS v4, shadcn/ui |
| Backend / BD | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| Despliegue | Vercel |
| Formularios | React Hook Form + Zod v4 |
| Iconos | Lucide React |

---

## 📁 Estructura relevante

```
src/
├── app/
│   ├── actions/          # Server Actions (events, matches, mixing-generator, users)
│   ├── admin/            # Generador de rondas de mixing
│   ├── dashboard/        # Vista principal del jugador
│   ├── events/           # Detalle de convocatoria
│   ├── history/          # Historial de partidos
│   └── profile/          # Perfil y cambio de contraseña
├── components/
│   ├── dashboard/        # MotivationalCard, MatchHistory, PlayerRankingPanel, RealtimeRefresher
│   ├── events/           # EventCard, CreateEventDialog, EditEventDialog, ShareEventButton
│   ├── matches/          # ValidationList, EditMatchDialog
│   └── ui/               # Componentes base (shadcn + ConfirmDialog)
└── lib/
    ├── rating-logic.ts   # Algoritmo ELO
    ├── mixing-algorithm.ts # Generador de emparejamientos
    └── config.ts         # Parámetros del sistema de rating
```

---

## 🚀 Instalación local

```bash
# 1. Clonar
git clone https://github.com/amat3/star-point.git
cd star-point

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus claves de Supabase

# 4. Desarrollo
npm run dev
```

### Variables de entorno necesarias

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Solo para operaciones de admin
```

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
MIN_RATING: 0
MAX_RATING: 7
INITIAL_RATING: 3.5
```

---

Creado con ❤️ para la comunidad de pádel.
