"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Receipt, ArrowRightLeft, Wallet, Target, X } from "lucide-react"

interface FloatingAddButtonProps {
  onAddTransaction: () => void
  onAddTransfer: () => void
  onAddAccount: () => void
  onAddBudget: () => void
}

export function FloatingAddButton({
  onAddTransaction,
  onAddTransfer,
  onAddAccount,
  onAddBudget,
}: FloatingAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const actions = [
    {
      label: "Add Transaction",
      icon: Receipt,
      onClick: onAddTransaction,
      gradient: "gradient-green",
      delay: "0ms",
    },
    {
      label: "Transfer Money",
      icon: ArrowRightLeft,
      onClick: onAddTransfer,
      gradient: "gradient-orange",
      delay: "50ms",
    },
    {
      label: "Add Account",
      icon: Wallet,
      onClick: onAddAccount,
      gradient: "gradient-blue",
      delay: "100ms",
    },
    {
      label: "Create Budget",
      icon: Target,
      onClick: onAddBudget,
      gradient: "gradient-purple",
      delay: "150ms",
    },
  ]

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-3 animate-fade-in">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <div
                key={action.label}
                className="flex items-center space-x-3 animate-slide-in-up"
                style={{ animationDelay: action.delay }}
              >
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-neutral-200/50">
                  <span className="text-sm font-medium text-neutral-700 whitespace-nowrap">{action.label}</span>
                </div>
                <Button
                  onClick={() => {
                    action.onClick()
                    setIsOpen(false)
                  }}
                  className={`h-12 w-12 rounded-2xl ${action.gradient} border-0 shadow-lg hover:scale-110 transition-all duration-200`}
                  aria-label={action.label}
                >
                  <Icon className="h-5 w-5 text-white" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Main FAB */}
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-16 w-16 rounded-2xl gradient-pink border-0 shadow-2xl hover:scale-110 transition-all duration-300 ${
          isOpen ? "rotate-45" : ""
        }`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
      </Button>
    </div>
  )
}
