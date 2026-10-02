import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typedRoutes: true,
  // AGENTS.md is the hand-maintained project rules file; don't let `next dev` append to it.
  agentRules: false,
}

export default nextConfig
