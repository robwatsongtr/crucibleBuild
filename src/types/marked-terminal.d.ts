import type { MarkedExtension } from 'marked'

declare module 'marked-terminal' {
  export const markedTerminal: (options?: Record<string, unknown>) => MarkedExtension
  export default markedTerminal
}
