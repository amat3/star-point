'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

const MESSAGES_MASC = [
  "🐢 A ver si hoy te mueves más que el último día, paquete.",
  "🤦 El pádel es deporte de equipo. Intenta que tu compañero no tenga que pedir la baja psicológica hoy.",
  "🎲 Hoy es tu día, campeón. O el de los rivales. Probablemente el de los rivales.",
  "🪄 La pala no se mueve sola, torpe... aunque a veces lo parece.",
  "🧬 Dicen que el talento no se entrena. Tú lo demuestras cada partido, crack.",
  "💥 ¿Preparado, máquina? El cristal no va a romperse solo.",
  "🫵 Recuerda, fenómeno: si pierdes, la culpa es siempre del compañero.",
  "😬 ¡El grupo te necesita! Para que hagas de relleno y pagar las pistas, pero te necesita.",
  "🛋️ Hoy sal a dar el 100%, leyenda. El 50% ya lo das durmiendo.",
  "🍺 Gran día para jugar, campeón. O para quedarte en el bar, tú decides.",
  "🤔 El que no arriesga no gana. El que arriesga mucho, tampoco. Piénsatelo, torpe.",
  "⏱️ Pensábamos que ibas a llegar tarde como siempre. Menos mal.",
  "🎯 El objetivo de hoy es pasarlo bien, máquina. Ganar sería un premio.",
  "📅 Se dice que la práctica hace al maestro. Lleva tiempo, ¿eh, paquete?",
  "💡 Si juegas bien te lo apuntamos, crack. Si juegas mal, fueron las luces de la pista.",
  "😬 El pádel no es fácil, campeón. Tampoco lo es verte jugar.",
  "🌈 Hoy la pelota sí va a entrar, fenómeno. Lo notamos en el ambiente.",
  "🎾 Recordatorio: la pelota tiene que pasar la red.",
  "🍽️ Los buenos días terminan con una buena bandeja, leyenda.",
  "💪 Que no se diga que no lo intentaste, inútil. Aunque luego no salga.",
  "🤏 Todos confiamos en ti, máquina. Más o menos.",
  "🏅 En el pádel lo importante es participar, paquete. Pero ganar de vez en cuando también mola.",
  "🐍 ¿A ver si hoy la víbora sale bien, crack? Tu pareja lo está esperando.",
  "📉 Hoy jugarás como nunca y perderás como siempre.",
  "⚔️ Nuevo día, nueva oportunidad de revancha, fenómeno.",
  "🥅 Hoy la red está a tu favor, leyenda.",
  "🧠 Jugar con el corazón está bien, campeón. Pero si usas las piernas para llegar a la bola, mejor.",
  "🤫 Dicen que eres de los mejores del grupo, paquete. Lo dicen pocos, pero lo dicen.",
  "🚫 Hoy no valen las excusas de 'es que juego en el revés', inútil. En la derecha juegas igual de mal.",
  "🚪 Ya estás aquí, leyenda. Eso ya es mérito.",
  "📆 El día que te pongas serio nos vas a barrer a todos, máquina. Hoy no es ese día.",
  "🙃 No te quejes... problemas tenemos todos.",
]

const MESSAGES_FEM = [
  "👠 A ver si hoy te mueves más que el último día, paquete.",
  "🙄 El pádel es deporte de equipo. Intenta no ser el problema, inútil.",
  "🌸 Hoy es tu día, campeona. O el de las rivales. Probablemente el de las rivales.",
  "✨ La pala no se mueve sola, torpe... aunque a veces lo parece.",
  "💅 Dicen que el talento no se entrena. Tú lo demuestras cada partido, crack.",
  "🔥 ¿Preparada, máquina? El cristal no va a romperse solo.",
  "👉 Recuerda, fenómena: si pierdes, la culpa es siempre de la compañera.",
  "🌪️ ¡El grupo te necesita! Que tiemblen las rivales... o no, da igual, eres un paquete.",
  "😴 Hoy sal a dar el 100%, leyenda. El 50% ya lo das durmiendo.",
  "☕ Gran día para jugar, campeona. O para quedarte en el bar, tú decides.",
  "🎰 La que no arriesga no gana. La que arriesga mucho, tampoco. Piénsatelo, torpe.",
  "😅 Pensábamos que ibas a llegar tarde como siempre. Menos mal.",
  "🎉 El objetivo de hoy es pasarlo bien, máquina. Ganar sería un premio.",
  "🗓️ Se dice que la práctica hace a la maestra. Lleva tiempo, ¿eh, paquete?",
  "🔦 Si juegas bien te lo apuntamos, crack. Si juegas mal, fueron las luces de la pista.",
  "🫣 El pádel no es fácil, campeona. Tampoco lo es verte jugar.",
  "🌟 Hoy la pelota sí va a entrar, fenómena. Lo notamos en el ambiente.",
  "🎾 Recordatorio: la pelota tiene que pasar la red.",
  "🏆 Los buenos días terminan con una buena bandeja, leyenda.",
  "🫀 Que no se diga que no lo intentaste, inútil. Aunque luego no salga.",
  "🤞 Todas confiamos en ti, máquina. Más o menos.",
  "🥈 En el pádel lo importante es participar, paquete. Pero ganar de vez en cuando también mola.",
  "🐍 ¿A ver si hoy la víbora sale bien, crack? Tu pareja lo está esperando.",
  "📊 Hoy jugarás como nunca y perderás como siempre.",
  "💢 Nuevo día, nueva oportunidad de revancha, fenómena.",
  "🥅 Hoy la red está a tu favor, leyenda.",
  "💡 Jugar con el corazón está bien, campeona. Jugar con la cabeza, mejor.",
  "🤐 Dicen que eres de las mejores del grupo, paquete. Lo dicen pocos, pero lo dicen.",
  "🚷 Hoy no es día de excusas, inútil. Mañana tampoco.",
  "🚀 Ya estás aquí, leyenda. Eso ya es mérito.",
  "🗓️ El día que te pongas seria nos vas a barrer a todas, máquina. Hoy no es ese día.",
  "🙃 No te quejes... problemas tenemos todos.",
]

interface MotivationalCardProps {
  userName: string
  gender: string
}

export function MotivationalCard({ userName, gender }: MotivationalCardProps) {
  const [dayIndex] = useState(() => Math.floor(Date.now() / (1000 * 60 * 60 * 24)))
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
        <div className="shrink-0 p-2 rounded-2xl bg-white/20 backdrop-blur-md mt-0.5 text-2xl leading-none">
          {emoji}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
            ¡Hola, {userName}!
          </span>
          <p className="text-sm sm:text-base font-medium text-white leading-snug">
            {text}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
