import { Avatar, Style } from "@dicebear/core"
import gaze from "@dicebear/styles/gaze.json" with { type: "json" }
import Image from "next/image"

import { cn } from "@/lib/utils"

const gazeStyle = new Style(gaze)

interface ChatAvatarProps {
  seed: string
  animated?: boolean
  className?: string
}

export function ChatAvatar({ seed, animated = false, className }: ChatAvatarProps) {
  const src = new Avatar(gazeStyle, {
    seed,
    ...(animated ? { animationVariant: "medium" } : {}),
  }).toDataUri()

  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      unoptimized
      className={cn("size-8", className)}
    />
  )
}
