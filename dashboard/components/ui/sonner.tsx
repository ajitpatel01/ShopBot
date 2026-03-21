"use client"

import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#111] group-[.toaster]:text-white group-[.toaster]:border-[#1f1f1f] group-[.toaster]:shadow-none",
          description: "group-[.toast]:text-[#666]",
          actionButton:
            "group-[.toast]:bg-white group-[.toast]:text-black",
          cancelButton:
            "group-[.toast]:bg-[#1f1f1f] group-[.toast]:text-[#aaa]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
