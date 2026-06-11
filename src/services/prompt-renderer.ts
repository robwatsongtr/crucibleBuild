import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ConstraintProfile, LearnerContext, Phase } from '../models/index.js'

export interface RenderedPrompt {
  staticSystem: string
  dynamicSystem: string
}

/**
 * Assembles the two-part system prompt from a ConstraintProfile and runtime LearnerContext.
 *
 * staticSystem  — persona + rules + project + phase catalog + full mentor charter.
 *                 Stable across the session; this block carries cache_control.
 * dynamicSystem — current phase detail + file tree + recent changes.
 *                 Changes per turn; never busts the static cache key.
 */
export class PromptRenderer {
  private readonly mentorCharter: string

  constructor(
    private readonly profile: ConstraintProfile,
    repoRoot: string,
  ) {
    const charterPath = resolve(repoRoot, 'luthor_curriculum/mentor_charter.md')
    this.mentorCharter = readFileSync(charterPath, 'utf-8')
  }

  render(context: LearnerContext): RenderedPrompt {
    const staticSystem = [
      this.renderPersona(),
      this.renderRules(),
      this.renderProjectSummary(),
      this.renderPhaseCatalog(),
      this.mentorCharter,
    ].join('\n\n')

    const dynamicSystem = [
      this.renderCurrentPhase(context),
      this.renderFileTree(context),
      this.renderRecentChanges(context),
    ].join('\n\n')

    return { staticSystem, dynamicSystem }
  }

  private renderPersona(): string {
    const { persona } = this.profile
    const tone = persona.tone.join(', ')
    const antiPatterns = persona.antiPatterns.map((p) => `- ${p}`).join('\n')
    const firmness = persona.firmnessExamples.map((e) => `- ${e}`).join('\n')

    return `# Who You Are\n\n${persona.voice}\n\n**Tone:** ${tone}\n\n**Firmness — how to apply it:**\n${firmness}\n\n**Never do these:**\n${antiPatterns}`
  }

  private renderRules(): string {
    const allowed = this.profile.rules.filter((r) => r.allowed)
    const disallowed = this.profile.rules.filter((r) => !r.allowed)

    const allowedRows = allowed
      .map((r) => {
        const examples = r.examples?.length ? '\n  ' + r.examples.join('\n  ') : ''

        return `| ✅ | **${r.label}** | ${r.description}${examples} |`
      })
      .join('\n')

    const disallowedRows = disallowed
      .map((r) => {
        const examples = r.examples?.length ? '\n  ' + r.examples.join('\n  ') : ''

        return `| ❌ | **${r.label}** | ${r.description}${examples} |`
      })
      .join('\n')

    const header = `# Constraint Profile\n\nThese rules are architectural. They cannot be negotiated mid-session.\n\n| | Rule | Detail |\n|---|---|---|`
    const footer = `If a learner asks you to write code, decline clearly and redirect: tell them what concept to think about, what to read, or what question to ask themselves. Do not apologise for the constraint. It is the point.`

    return `${header}\n${allowedRows}\n${disallowedRows}\n\n${footer}`
  }

  private renderProjectSummary(): string {
    const { project } = this.profile
    const artifacts = project.referenceArtifacts.map((a) => `- ${a}`).join('\n')

    return `# Project: ${project.title}\n\n${project.summary}\n\n**Reference artifacts available via read_file:**\n${artifacts}`
  }

  private renderPhaseCatalog(): string {
    const phases = this.profile.project.phases
    const pythonPhases = phases.filter((p) => p.id.startsWith('python'))
    const cppPhases = phases.filter((p) => p.id.startsWith('cpp'))

    const renderPhaseRow = (p: Phase, index: number): string =>
      `${index + 1}. **${p.id}** — ${p.title}\n   Concepts: ${p.conceptsIntroduced.join(', ')}`

    const pythonRows = pythonPhases.map((p, i) => renderPhaseRow(p, i)).join('\n')
    const cppRows = cppPhases.map((p, i) => renderPhaseRow(p, i + 5)).join('\n')

    return `# Phase Catalog\n\n**Pass 1 — Python:**\n${pythonRows}\n\n**Pass 2 — C++ Rewrite:**\n${cppRows}`
  }

  private renderCurrentPhase(context: LearnerContext): string {
    const phase = this.profile.project.phases.find((p) => p.id === context.currentPhaseId)

    if (!phase) {
      return `# Current Phase\n\nPhase ID: ${context.currentPhaseId} (unknown — check config)`
    }

    const goals = phase.goals.map((g) => `- ${g}`).join('\n')
    const checkpoints = phase.checkpoints.map((c) => `- ${c}`).join('\n')
    const concepts = phase.conceptsIntroduced.join(', ')

    return `# Current Phase\n\n**${phase.id}** — ${phase.title}\n\n**Goals:**\n${goals}\n\n**Checkpoints:**\n${checkpoints}\n\n**Concepts introduced:** ${concepts}`
  }

  private renderFileTree(context: LearnerContext): string {
    return `# Project File Tree\n\n\`\`\`\n${context.fileTree}\n\`\`\``
  }

  private renderRecentChanges(context: LearnerContext): string {
    if (context.recentChanges.length === 0) {
      return `# Recent Changes\n\nNo recent file changes.`
    }

    const lines = context.recentChanges.map((c) => `- [${c.kind}] ${c.path} at ${c.at}`).join('\n')

    return `# Recent Changes\n\n${lines}`
  }
}
