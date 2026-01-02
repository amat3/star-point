# StarPoint 🎾

**StarPoint** es una PWA (Progressive Web App) moderna diseñada para gestionar partidos, rankings y niveles de jugadores de pádel de forma justa y automatizada. Creada con **Next.js 14**, **Supabase** y **TailwindCSS**.

## ✨ Características Principales

### 🏆 Sistema de Ranking ELO Avanzado
El corazón de la aplicación es su algoritmo de nivel dinámico, diseñado para mantener el equilibrio competitivo:
- **K-Factor Dinámico**: Los nuevos jugadores (primeros 10 partidos) suben/bajan más rápido (`K=0.40`) para encontrar su nivel real. Jugadores consolidados tienen un factor más estable (`K=0.15`).
- **Score Multiplier**: No es lo mismo ganar 6-0 que 7-6. La contundencia de la victoria afecta a los puntos ganados.
- **Protección contra Farming**: Partidos con diferencia de nivel > 2.0 no afectan al ranking.
- **Corrección de Inflación**: A partir de nivel 5.0, es más difícil sumar puntos.

### ⚔️ Gestión de Partidos
- **Validación en Tiempo Real**: El formulario de "Nuevo Partido" valida reglas de pádel al instante (Sets, Tie-breaks, Super Tie-break de desempate).
- **Flujo de Confirmación**:
  - Los partidos creados quedan en estado `pending`.
  - Deben ser validados por los propios jugadores o un administrador.
  - Se pueden **Impugnar** si el resultado es incorrecto, bloqueando la confirmación hasta que un Admin intervenga.
- **Soporte Mixing**: Modalidad especial donde el resultado se basa en juegos totales, no sets (afecta un 25% al ranking).

### 👥 Perfiles y Estadísticas
- Gráficos de evolución de nivel.
- Estadísticas de victorias/derrotas.
- Historial detallado de partidos con cambios de nivel (ej. `+0.12`).

### 🛠️ Roles
- **Jugador**: Puede crear partidos, ver estadísticas y validar partidos donde ha participado.
- **Admin**: Control total. Puede confirmar, eliminar o editar cualquier partido y gestionar usuarios.

## 🚀 Tecnologías

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS, Shadcn/UI.
- **Backend & Auth**: Supabase (PostgreSQL + Auth).
- **Infraestructura**: Vercel.

## 📱 Instalación (Local)

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/amat3/star-point.git
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env.local` con tus claves de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key # Solo para tareas de admin
   ```

4. **Ejecutar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

---
Creado con ❤️ para la comunidad de pádel.
