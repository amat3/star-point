'use client'

import { Card, CardContent } from "@/components/ui/card"

const MESSAGES_MASC = [
  "🐢 A ver si hoy te mueves más que el último día, paquete.",
  "🙃 No te quejes... problemas tenemos todos.",
  "🎾 Hoy toca pádel. Las excusas pueden esperar fuera de la pista.",
  "🧱 Recuerda: el cristal está ahí para usarlo, no para discutir con él.",
  "😏 Hoy vienes fino. O eso dice la convocatoria.",
  "🎯 Una bola dentro, otra dentro… vamos construyendo.",
  "🦶 El pádel también se juega con las piernas. Dato que conviene recordar.",
  "🔥 Hoy puede ser un gran día para sacar tu mejor versión. O al menos intentarlo.",
  "🤝 El pádel es deporte de pareja. Cuídala, que no hay cambios en el descanso.",
  "🎾 La pala está preparada. Ahora solo falta que tú también.",
  "🧠 Antes de pegarle fuerte, piensa. Sí, sabemos que cuesta.",
  "🪟 El cristal no es tu enemigo. Aunque algunas bolas parezcan tener algo personal con él.",
  "😎 Hoy sal a la pista con confianza. La técnica ya irá llegando.",
  "📐 Bandeja alta, piernas activas y cero decisiones cuestionables. Fácil.",
  "🐍 Si hoy sale una víbora buena, recuerda: también ha sido un poco de suerte.",
  "🚀 Una bola bien puesta vale más que tres pegadas con ganas.",
  "⏱️ Llegar a tiempo también forma parte del entrenamiento.",
  "🎯 Hoy apunta a los huecos. Los rivales ya se encargan de dejarlos.",
  "💨 Si corres un poco más, quizá llegues a esa bola. Quizá.",
  "🍺 Después del partido hay tercer set. Se juega en el bar.",
  "🧱 Usa las paredes. Para eso están. Y no, no hace falta pedir permiso.",
  "🤔 El globo bien tirado es una maravilla. El globo que toca la verja, menos.",
  "🏆 Hoy no hace falta ganar. Pero tampoco vamos a poner límites.",
  "🎾 Recuerda: la pelota tiene que pasar la red. Empezamos por ahí.",
  "😬 Esa bola parecía fácil… hasta que hubo que jugarla.",
  "💪 Un partido más, una oportunidad más para echarle la culpa al bote.",
  "📉 Hay días de magia y días de supervivencia. Hoy veremos cuál toca.",
  "🧠 Jugar con cabeza está bien. Tenerla en la pista, todavía mejor.",
  "🎯 Menos buscar el punto imposible y más poner la bola donde molesta.",
  "😏 Si sale bien, era estrategia. Si sale mal, estaba todo calculado.",
  "🪄 Que aparezca hoy esa bandeja que llevas meses esperando.",
  "🚪 Ya estás dentro de la pista. Ahora toca justificar la reserva.",
  "📣 Tu compañero confía en ti. Procura que siga haciéndolo después del primer juego.",
  "🎾 Hoy toca disfrutar. Y, si se puede, dejar alguna bola imposible para el recuerdo.",
]

const MESSAGES_FEM = [
  "👠 A ver si hoy te mueves más que el último día, paquete.",
  "🙃 No te quejes... problemas tenemos todos.",
  "🎾 Hoy toca pádel. Las excusas pueden quedarse calentando fuera.",
  "🧱 El cristal también juega. Intenta que hoy juegue de tu parte.",
  "😏 Hoy vienes con ganas. Ahora solo falta que la pala se entere.",
  "🎯 Bola dentro, siguiente bola. La épica puede esperar.",
  "🦶 La pala ayuda, pero llegar a la bola también cuenta.",
  "🔥 Hoy es buen día para sacar tu mejor pádel. El resultado ya veremos.",
  "🤝 Cuida a tu compañera. Es la única que puede salvarte de algunas bolas.",
  "🎾 Pala preparada, zapatillas puestas… ya no hay vuelta atrás.",
  "🧠 Antes de pegarle fuerte, mira. El hueco suele estar ahí.",
  "🪟 Las paredes están para aprovecharlas. No hace falta jugar siempre por arriba.",
  "😎 Confianza arriba y errores abajo. Ese es el plan.",
  "📐 Bandeja con calma, piernas activas y que sea lo que Dios quiera.",
  "🐍 Hoy puede salir esa víbora que llevas practicando. O una versión experimental.",
  "🚀 Una bola inteligente puede hacer más daño que un misil sin dirección.",
  "⏱️ Llegar puntual también suma puntos. Bueno… al menos para la organización.",
  "🎯 Busca los huecos. Las rivales no los han dejado ahí por decoración.",
  "💨 Esa bola se puede llegar. Otra cosa es qué hacemos cuando lleguemos.",
  "☕ Después del partido analizamos el tercer set. En la cafetería, por supuesto.",
  "🧱 Cristal, suelo y pala. Hoy toca intentar que todo trabaje a favor.",
  "🤔 Un buen globo puede cambiar un punto. Uno demasiado largo también.",
  "🏆 Hoy no hace falta ganar. Pero si cae una victoria, tampoco la vamos a devolver.",
  "🎾 Recordatorio amistoso: la pelota tiene que pasar la red.",
  "😬 Parecía una bola fácil. El pádel tiene estas cosas.",
  "💪 Un partido más para mejorar… o para descubrir una nueva excusa técnica.",
  "📉 Hay días de puntos espectaculares y días de correr detrás de la bola. Ambos cuentan.",
  "🧠 Jugar con cabeza siempre ayuda. Sobre todo cuando las piernas empiezan a negociar.",
  "🎯 Menos buscar el golpe definitivo y más hacer que la rival trabaje.",
  "😏 Si sale perfecta, era técnica. Si sale a la verja, era un experimento.",
  "🪄 A ver si hoy aparece esa bandeja que llevamos tanto tiempo esperando.",
  "🚪 Ya estás en la pista. Ahora toca demostrar que la reserva tenía sentido.",
  "📣 Tu compañera confía en ti. Haz que dure al menos hasta el cambio de lado.",
  "🎾 Disfruta, compite y deja alguna bola de esas que luego se cuentan en el bar.",
]

interface MotivationalCardProps {
  userName: string
  gender: string
  dayIndex: number
}

export function MotivationalCard({ userName, gender, dayIndex }: MotivationalCardProps) {
  const messages = gender === 'femenino' ? MESSAGES_FEM : MESSAGES_MASC
  const fullMessage = messages[dayIndex % messages.length]
  const [emoji, ...rest] = fullMessage.split(' ')
  const text = rest.join(' ')

  return (
    <Card className="overflow-hidden relative border-none shadow-xl transform transition-all duration-300 hover:scale-[1.01] group">
      <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/90 to-blue-600 dark:from-primary/80 dark:to-blue-900 z-0" />
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white/10 blur-xl z-0" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-secondary/20 blur-2xl z-0" />

      <CardContent className="relative z-10 py-5 sm:py-6 px-1 sm:px-2 flex items-start gap-4 text-white">
        <div className="shrink-0 p-2 rounded-2xl bg-white/20 backdrop-blur-md mt-0.5 text-3xl sm:text-2xl leading-none">
          {emoji}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm sm:text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
            ¡Hola, {userName}!
          </span>
          <p className="text-base sm:text-base font-medium text-white leading-snug">
            {text}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
