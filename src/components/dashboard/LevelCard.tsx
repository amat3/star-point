import { Card, CardContent } from "@/components/ui/card"
import { Medal, Sparkles } from "lucide-react"

interface LevelCardProps {
  level: string
}

export function LevelCard({ level }: LevelCardProps) {
  return (
    <Card className="col-span-2 sm:col-span-1 overflow-hidden relative border-none shadow-xl transform transition-all duration-300 hover:scale-[1.02] group">
      {/* Background with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-blue-600 dark:from-primary/80 dark:to-blue-900 opacity-100 z-0"></div>
      
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-white/10 blur-xl z-0"></div>
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-secondary/20 blur-2xl z-0"></div>
      
      <CardContent className="relative z-10 p-6 flex flex-col justify-between h-full text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
             <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md">
                <Medal className="h-5 w-5 text-secondary" />
             </div>
             <span className="font-semibold tracking-wide text-primary-foreground/90 uppercase text-xs sm:text-sm">Tu Nivel</span>
          </div>
          <Sparkles className="h-5 w-5 text-secondary animate-pulse" />
        </div>
        
        <div className="mt-auto">
          <div className="flex items-baseline space-x-1">
             <span className="text-5xl sm:text-6xl font-black text-white leading-none tracking-tighter drop-shadow-sm">
               {level}
             </span>
             <span className="text-xl font-medium text-primary-foreground/70">pts</span>
          </div>
          <p className="text-xs sm:text-sm text-primary-foreground/60 mt-2 font-medium">
             Sigue jugando para subir de nivel
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
