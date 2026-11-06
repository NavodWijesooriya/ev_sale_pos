"use client"

import * as React from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"

interface PasswordFieldProps {
  id: string
  name?: string
  value?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  required?: boolean
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
}

export function PasswordField({
  id,
  name,
  value,
  onChange,
  required = true,
  disabled = false,
  placeholder = "Enter your password",
  autoComplete = "current-password",
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div className="relative">
      <Lock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#89968e]" />
      <Input
        id={id}
        name={name}
        type={isVisible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className="h-12 rounded-xl border-[#dfe6e0] bg-white pl-11 pr-12 text-[15px] shadow-none transition-colors placeholder:text-[#a0aaa3] focus-visible:border-[#57806a] focus-visible:ring-[#57806a]/15"
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        disabled={disabled}
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#77827b] transition-colors hover:bg-[#f1f4f1] hover:text-[#315b47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57806a]/30 disabled:pointer-events-none disabled:opacity-50"
      >
        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
