import { Chalk } from 'chalk'
import { marked } from 'marked'
import TerminalRenderer from 'marked-terminal'
import wrapAnsi from 'wrap-ansi'

const c = new Chalk({ level: 3 })

marked.setOptions({
  renderer: new TerminalRenderer({
    showSectionPrefix: false,
    reflowText: false,
    heading: c.green.bold,
    firstHeading: c.magenta.underline.bold,
    strong: c.bold,
    em: c.italic,
    codespan: c.yellow,
    code: c.yellow,
    blockquote: c.gray.italic,
    hr: () => '\n',
  }) as never,
})

/** Renders a markdown string to ANSI-coloured terminal output. */
export const renderMarkdown = (text: string): string => {
  const width = Math.min(process.stdout.columns ?? 80, 100)
  const rendered = marked(text) as string

  return wrapAnsi(rendered, width, { hard: false, trim: false })
}
