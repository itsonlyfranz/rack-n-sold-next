'use client'

import React, { createContext, useContext, useState } from 'react'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastContextType {
  toast: (props: ToastProps) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastProps & { id: number })[]>([])
  
  const toast = (props: ToastProps) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { ...props, id }])
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }
  
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 space-y-4 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-md shadow-lg ${
              t.variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-background text-foreground border'
            }`}
          >
            <div className="font-medium">{t.title}</div>
            {t.description && <div className="text-sm mt-1">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
} 