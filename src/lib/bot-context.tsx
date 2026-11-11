import { createContext, useContext } from "react"
import type { useAgent } from "agents/react"
import type { BotAgent } from "@/agents/bot-agent"
import type { BotState } from "@/lib/types"

export type BotConnection = ReturnType<typeof useAgent<BotAgent, BotState>>

/** The common computer surface; members get only these scoped operations. */
export interface ComputerConnection {
  stub: Pick<
    BotConnection["stub"],
    | "getLiveView"
    | "getBrowserFrame"
    | "navigateBrowser"
    | "closeBrowser"
    | "getActivity"
    | "readFileData"
    | "readFileText"
    | "runCommand"
    | "listWorkspace"
  >
}

interface BotContextValue {
  botId: string
  state: BotState
  /** Null during SSR and until the bot's WebSocket is up. */
  agent: BotConnection | null
}

export const BotContext = createContext<BotContextValue | null>(null)

export function useBot() {
  const value = useContext(BotContext)
  if (!value) throw new Error("useBot must be used inside a bot route")
  return value
}
