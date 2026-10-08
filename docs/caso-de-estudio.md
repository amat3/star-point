# starpoint · Caso de estudio

🌐 [Read in English](case-study.md)

> Una PWA para un grupo real de pádel: sorteos de parejas que evitan repetirse, ranking ELO adaptado a dobles, partidos publicados para buscar jugadores y validación de resultados entre rivales. En producción desde julio de 2026, con unos 30 jugadores.

<p align="center">
  <img src="social-preview.png" alt="starpoint · Tu app de Pádel" width="640">
</p>

<p align="center">
  <img src="img/02-inicio.png" alt="Inicio: tus eventos y partidos" width="190">
  <img src="img/03-mixing.png" alt="Un mixing: quién viene y apuntarse" width="190">
  <img src="img/04-sorteo.png" alt="El sorteo: tu pista, tu pareja y tus rivales" width="190">
  <img src="img/05-publicar-partido.png" alt="Publicar un partido con comentario" width="190">
</p>

<p align="center">
  <sub>Inicio · Mixing · Sorteo · Publicar partido &nbsp;(demo con datos ficticios)</sub><br>
  ▶ <a href="img/demo.mp4"><b>Recorrido en vídeo</b></a> (67 s) · <img src="img/splash.gif" alt="Animación de entrada" width="70" align="middle">
</p>

| | |
|---|---|
| **Estado** | En producción · versión 1.0.0 (octubre de 2026) |
| **Uso real** | Un grupo de unos 30 jugadores, un mixing semanal y partidos sueltos; más de 130 partidos confirmados en el historial |
| **Mi papel** | Diseño, desarrollo, base de datos, despliegue y operación (proyecto individual) |
| **Stack** | Next.js 16 (App Router) · React 19 · TypeScript estricto · Emotion · Supabase (PostgreSQL, Auth, Realtime, RLS) · Vercel · Web Push · Vitest |

---

## 1. El problema

Cada semana, el grupo organizaba su "mixing" por WhatsApp: una docena de personas, tres pistas y tres rondas en las que todos juegan con y contra todos. Hacer el sorteo a mano tenía tres problemas:

- **Se repetían parejas y rivales**, y siempre salían las mismas combinaciones.
- **Los partidos estaban desequilibrados** (un nivel muy alto con uno muy bajo contra dos intermedios), y nadie quería ser quien lo decidiera.
- **No había memoria**: los resultados se perdían en el chat, no existía un ranking y cualquier discusión sobre "quién ganó" acababa sin resolverse.

Además, había que gestionar quién se apunta, quién está en reserva, quién se borra a última hora y cuándo se avisa a los demás.

## 2. La solución

Una aplicación móvil instalable (PWA) con dos flujos principales:

**Mixing semanal**
- Inscripción con **lista de espera**: titulares y reservas por orden de apuntado, con ascenso automático cuando alguien se borra.
- **Sorteo** de parejas y rivales para todas las rondas, con un resumen de repeticiones antes de publicarlo.
- Cada jugador ve **solo su partido**, y la vista pasa sola a su ronda actual según la hora.
- El administrador puede editar, rehacer o anular el sorteo, y cambiar las parejas de una pista si los cuatro jugadores lo deciden.
- Un cron crea el evento de la semana siguiente de forma automática.

**Partidos**
- Cualquier jugador publica un partido (club, día, hora, cuántos jugadores faltan y un comentario libre) y se avisa al grupo por notificación push.
- La pantalla muestra siempre los cuatro puestos: el organizador, los que ya tiene cerrados, los que se apuntan y los libres.
- El organizador puede añadir jugadores de fuera del grupo.

**Resultados y ranking**
- Un jugador introduce el marcador y **el rival lo confirma o lo corrige**. Si nadie responde en 24 horas, se da por bueno el último marcador.
- Al confirmar se actualiza el ELO de los cuatro jugadores, su historial y sus estadísticas.

## 3. Arquitectura

```
Navegador / PWA (móvil)
   │   Server Components + Server Actions (Next.js App Router)
   ▼
Next.js en Vercel ──────────────► Supabase
   │  • páginas dinámicas              • PostgreSQL con RLS
   │  • DTOs construidos en servidor   • Auth (cookies SSR)
   │  • cron semanal (Vercel)          • Realtime (cambios en vivo)
   │  • endpoint de cierre (protegido) • RPC atómicas (SECURITY DEFINER)
   ▲                                   • pg_cron + pg_net (cierre cada hora)
   │
Service Worker ◄── Web Push (VAPID)
```

Las páginas de servidor consultan la base de datos, construyen **objetos planos con solo lo que cada usuario puede ver** y los pasan a componentes de cliente. Los permisos se comprueban siempre en el servidor, contra el rol real del usuario.

## 4. Decisiones técnicas

### 4.1 Un sorteo con prioridades explícitas

El objetivo era claro: todos juegan con y contra todos, sin repetir. Pero con grupos de cuatro, **hay límites matemáticos**: con 12 jugadores y 3 rondas es imposible evitar los reencuentros (el mínimo son 9), y con 16 jugadores se puede llegar a cero. El algoritmo tenía que ser honesto con eso y no prometer imposibles.

Lo resolví con una **jerarquía de costes**, de más a menos importante:

1. **Duro:** las exclusiones configuradas (por ejemplo, "estos dos no juegan juntos") y repetir pareja dentro del evento. Solo se acepta romperlo si ninguna combinación del grupo lo evita.
2. **Fuerte:** volver a coincidir en pista dentro del mismo evento.
3. **Blando:** el nivel (parejas equilibradas y medias parecidas entre pistas), que pesa más que lo que pasó el evento anterior.
4. **Más blando:** repetir lo del evento anterior.
5. **Desempate:** la posición en pista (drive y revés).

Se resuelve en dos capas: un planificador de grupos de cuatro por ronda (inicio aleatorio, búsqueda local por intercambios y varios reinicios) y, dentro de cada grupo, la elección de la mejor de las tres parejas posibles. Los avisos al administrador solo hablan de repeticiones **dentro del evento** y solo cuando se repite la *misma* relación: haber sido pareja y luego rival no es un fallo.

**Cómo lo comprobé:** las pruebas no comparan resultados exactos (el algoritmo es aleatorio), sino **invariantes** repetidos muchas veces: nunca se repite pareja, 12 jugadores en 3 rondas no pasan de 10 reencuentros, 16 en 3 rondas llegan a cero. Los pesos los ajusté simulando cientos de sorteos con el historial real de un evento anterior.

### 4.2 Un ELO pensado para pádel de dobles

Un ELO estándar no encajaba: aquí juegan dos contra dos, con muchos partidos sueltos y jugadores nuevos. El cálculo incluye:

- **K dinámico:** más volátil para quien tiene menos de 10 partidos.
- **Peso del margen del resultado:** ganar 8-2 no vale lo mismo que 6-5.
- **Filtro de disparidad:** si los equipos son muy desiguales, el partido apenas puntúa.
- **Amortiguación en el extremo alto** y límites de 0 a 7.
- **Protección ante invitados:** ningún jugador real pierde rating si hay un invitado en el partido.

Los parámetros viven en un único archivo de configuración. Tras tres semanas de uso real vi que los niveles apenas se diferenciaban, así que **subí el peso del margen de 0,40 a 0,70**. No lo hice a ojo: comparé varios candidatos simulando el efecto sobre la dispersión de ratings *y* sobre la calidad de los sorteos resultantes, y apliqué el cambio **con retroactividad** mediante un script que primero simula (dry-run) y solo escribe tras confirmación.

### 4.3 Confirmar un resultado es una operación atómica

Confirmar un partido modifica cuatro perfiles, su historial y el propio partido. Si falla a mitad, el ranking queda corrupto. Por eso es **una única función de PostgreSQL** (`confirm_match_atomic`), con bloqueo de fila y protección contra doble confirmación, que es el *único* sitio donde se escriben ratings y estadísticas. La misma lógica la reutilizan la acción del usuario y el cierre automático.

### 4.4 Seguridad y privacidad aplicadas en el servidor

- **Los jugadores nunca ven el nivel de los demás**, solo su posición en pista. Esto no se resuelve ocultándolo en la interfaz: el dato **no llega al navegador**, porque los objetos que se envían se construyen sin él.
- En un sorteo, cada jugador recibe únicamente su propio partido. Los visitantes solo ven recuentos (sin nombres).
- Las funciones `SECURITY DEFINER` tenían un fallo sutil: con un visitante sin sesión, `auth.uid()` es nulo y las comparaciones del tipo `IF a <> b` dan nulo (ni verdadero ni falso), de modo que **la comprobación de permisos se saltaba**. Lo corregí rechazando explícitamente las llamadas anónimas, retirando permisos y cerrando la lectura pública de perfiles, partidos y historial.
- **Cómo lo verifiqué sin tocar datos reales:** ejecuté la función dentro de un bloque que termina con un error deliberado, lo que fuerza el deshacer de toda la transacción. Probé tres casos (visitante, usuario ajeno al partido, administrador) y comprobé después que no se había guardado nada.

### 4.5 Cierre automático de partidos

Si un rival no responde, el partido no puede quedarse en el limbo. Un trabajo programado en Supabase (`pg_cron` + `pg_net`) llama cada hora a un endpoint protegido de la aplicación, que confirma los resultados sin respuesta tras 24 horas y caduca los partidos que no llegaron a tener marcador. El endpoint reutiliza el mismo código de confirmación que la acción del usuario.

### 4.6 Del CSS utilitario a un sistema de diseño propio

Migré toda la interfaz de **Tailwind + shadcn a Emotion**, con tokens de tema (colores, radios, sombras, tipografías) en un único archivo y componentes organizados en átomos, moléculas y organismos. Detalles que merecen mención:

- **Sin parpadeo entre tema claro y oscuro:** los colores de la página se conmutan con variables CSS y una clase que se aplica antes del primer pintado.
- **Renderizado en servidor de los estilos** mediante una caché de Emotion, para evitar el salto de estilos al cargar.
- **Los Server Components no pueden usar `styled`**, así que los estilos viven en componentes de cliente y las páginas de servidor solo montan datos.
- Una interfaz de una sola columna pensada solo para móvil: sin puntos de ruptura, y con ajustes específicos para iOS (por ejemplo, los campos de fecha y hora).

### 4.7 PWA con detalles cuidados

- **El icono se dibuja desde código** (`next/og`) y es la única fuente del icono, del favicon, de las notificaciones y de la imagen para compartir enlaces.
- **Pantalla de bienvenida animada** que solo aparece en la primera carga de la sesión; un pequeño script decide *antes del primer pintado* si se muestra, para que nunca parpadee.
- **Notificaciones push** con service worker y un interruptor para desactivarlas en pruebas contra datos reales.
- **Actualización sin recargar:** Supabase Realtime refresca las pantallas cuando cambia algo, y un temporizador único refresca justo cuando un partido empieza o termina, sin consultar la base de datos de forma periódica.

## 5. Calidad y proceso de trabajo

- **Integración continua** en GitHub Actions: `tsc`, `eslint`, tests (Vitest) y `next build` en cada PR.
- **Pruebas sobre la lógica de más riesgo:** ELO, algoritmo de sorteo y utilidades de fechas con zona horaria de Madrid (un fallo real con el cambio de hora quedó fijado en un test).
- **Migraciones como archivos SQL** versionados, aplicadas con cuidado y con comprobaciones de solo lectura antes y después.
- **Despliegues con vista previa** en cada push, versión etiquetada (`v1.0.0`) y mensajes de commit convencionales.
- **Documentación viva** (`AGENT.md`) con las decisiones, las reglas de privacidad y las lecciones aprendidas, pensada para que cualquier colaborador, humano o asistente, retome el proyecto sin perder contexto.

## 6. Errores que enseñaron algo

- **Un borrado que no borraba.** Una tabla sin política de `DELETE` hace que el borrado con un usuario normal **no dé error, pero tampoco elimine nada**. Dejó datos huérfanos y un mensaje de "ya hay partidos generados". Ahora todo borrado de este tipo se hace tras autorizar al usuario y con el cliente de servicio.
- **Un cron apuntando a una ruta inexistente.** Lo detecté al listar los trabajos *realmente registrados* en la plataforma y no solo leyendo el archivo de configuración: durante días no había creado ningún evento.
- **Un fallo de permisos invisible en una función con `NULL`.** Descrito arriba: lo más peligroso no era que fallase, sino que parecía funcionar.
- **Corregir un dato histórico con cadena de efectos.** Cuando hubo que cambiar un resultado antiguo, el ELO de los jugadores implicados y el de todos los partidos posteriores dependía de él. Lo resolví **rejugando la cadena afectada**: validé primero el modelo contra todo el historial (535 de 540 cálculos exactos), simulé, hice copia de seguridad y apliqué solo la diferencia, para no alterar a nadie con discrepancias anteriores.

## 7. Qué mejoraría

- **Pruebas de extremo a extremo** (hoy se prueba la lógica pura, no los flujos completos).
- Avisos más finos (recordatorios antes de un partido), si el grupo los pidiera: de momento no hacen falta.

El entorno de demostración con datos ficticios, que figuraba antes en esta lista, ya está en marcha: [star-point-demo.vercel.app](https://star-point-demo.vercel.app).

## 8. Stack y estructura

| Capa | Tecnología |
|---|---|
| Interfaz | Next.js 16 (App Router), React 19, Emotion, Lucide, Radix UI (primitivas) |
| Formularios | React Hook Form + Zod |
| Datos y autenticación | Supabase: PostgreSQL, Auth con cookies SSR, Realtime, RLS |
| Lógica de negocio | TypeScript estricto: algoritmo de sorteo, ELO, ciclo de vida de los partidos |
| Tiempo real y avisos | Supabase Realtime, Web Push (VAPID), service worker |
| Operación | Vercel (despliegue y cron semanal), `pg_cron` + `pg_net` (cierre automático) |
| Calidad | Vitest, ESLint, GitHub Actions |

```
src/
├── app/          # rutas, server actions y endpoints de cron
├── components/   # atoms · molecules · organisms (sistema de diseño propio)
├── lib/          # sorteo, ELO, confirmación de partidos, utilidades de fechas
└── utils/        # clientes de Supabase (navegador, servidor y servicio)
```

Más detalles técnicos y reglas del proyecto en [AGENT.md](../AGENT.md); instalación y variables de entorno en el [README](../README.md).
