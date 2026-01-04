# StarPoint 🎾

**StarPoint** es una PWA (Progressive Web App) moderna diseñada para gestionar partidos, rankings y niveles de jugadores de pádel de forma justa y automatizada. Creada con **Next.js 16**, **Supabase** y **TailwindCSS**.

## ✨ Características Principales

### 🔄 Sistema de Mixing Automatizado (Nuevo)
Gestión integral de eventos tipo "Mixing" (Americano/Pozo):
- **Convocatorias**: Los admins crean eventos con fecha, hora, duración y plazas.
- **Algoritmo Inteligente**: Genera emparejamientos automáticos maximizando la diversión:
  - **Balance**: Busca partidos reñidos o equilibra parejas (Pro-Am).
  - **Variedad**: Penaliza repetir compañeros o rivales consecutivos.
  - **Posición**: Prioriza parejas Drive + Revés.
- **Lista de Espera**: Gestión automática de titulares y reservas por orden de inscripción.

### 🏆 Sistema de Ranking ELO Avanzado
El corazón de la aplicación es su algoritmo de nivel dinámico:
- **K-Factor Dinámico**: Ajuste rápido para nuevos jugadores (`K=0.40`) y estabilidad para veteranos (`K=0.15`).
- **Multiplicador de Intensidad**: La contundencia del resultado afecta a los puntos (+6-0 vs +7-6).
- **Protección**: Partidos desequilibrados (>2.0 diferencia) no afectan al ranking.

### ⚔️ Gestión de Partidos
- **Validación**: Los partidos requieren confirmación de ambos equipos.
- **Historial**: Visión detallada de resultados, filtrado y paginación.
- **Impugnación**: Mecanismo para reportar resultados incorrectos.

### 🎨 Design Soul (Nuevo)
Interfaz renovada con identidad "Modern Padel":
- **Identidad**: Colores Deep Navy & Fluor Green.
- **Navegación**: Optimizada para móvil con barra de navegación inferior y cabeceras limpias.
- **Feedback**: Estados vacíos (Empty States) amigables y loaders animados.

### 🛠️ Roles y Administración
- **Jugador**: Inscribirse a mixings, registrar partidos, ver estadísticas.
- **Admin**: 
  - Generar cruces de mixing con un clic.
  - Editar/Eliminar/Confirmar cualquier partido.
  - **Difusión**: Compartir eventos por WhatsApp con formato atractivo (fecha, hora, reservas).
  - Gestionar usuarios y roles.
  - *Nota: El registro de nuevos usuarios está actualmente deshabilitado (solo por Admin).*

## 🚀 Tecnologías

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS, Lucide Icons.
- **Backend**: Supabase (PostgreSQL, Auth, Realtime).
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
