import { Chalk } from 'chalk'
import { marked } from 'marked'
import TerminalRenderer from 'marked-terminal'

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
export const renderMarkdown = (text: string): string => marked(text) as string
