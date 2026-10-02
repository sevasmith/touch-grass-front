"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

export function QueryProvider({ children }: { children: ReactNode }) {
  // One client per browser session; mutations are never retried (an auth action runs once).
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { mutations: { retry: 0 } } })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
