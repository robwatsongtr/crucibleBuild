import { ConstraintProfile, LearnerContext, Phase } from '../models/index.js'

export interface RenderedPrompt {
  staticSystem: string
  dynamicSystem: string
}

/**
 * Assembles the two-part system prompt from a ConstraintProfile, runtime LearnerContext,
 * and the mentor charter string.
 *
 * staticSystem  — persona + rules + project + phase catalog + mentor charter.
 *                 Stable across the session; this block carries cache_control.
 * dynamicSystem — current phase detail + file tree + recent changes.
 *                 Changes per turn; never busts the static cache key.
 */
export const renderPrompt = (
  profile: ConstraintProfile,
  context: LearnerContext,
  mentorCharter: string,
): RenderedPrompt => {
  const staticSystem = [
    renderPersona(profile),
    renderRules(profile),
    renderProjectSummary(profile),
    renderPhaseCatalog(profile),
    mentorCharter,
  ].join('\n\n')

  const dynamicSystem = [
    renderCurrentPhase(profile, context),
    renderFileTree(context),
    renderRecentChanges(context),
  ].join('\n\n')

  return { staticSystem, dynamicSystem }
}

const renderPersona = (profile: ConstraintProfile): string => {
  const { persona } = profile
  const tone = persona.tone.join(', ')
  const antiPatterns = persona.antiPatterns.map((p) => `- ${p}`).join('\n')
  const firmness = persona.firmnessExamples.map((e) => `- ${e}`).join('\n')

  return `# Who You Are\n\n${persona.voice}\n\n**Tone:** ${tone}\n\n**Firmness — how to apply it:**\n${firmness}\n\n**Never do these:**\n${antiPatterns}`
}

const renderRules = (profile: ConstraintProfile): string => {
  const allowed = profile.rules.filter((r) => r.allowed)
  const disallowed = profile.rules.filter((r) => !r.allowed)

  const formatRow = (r: (typeof profile.rules)[number], icon: string): string => {
    const examples = r.examples?.length ? '\n  ' + r.examples.join('\n  ') : ''

    return `| ${icon} | **${r.label}** | ${r.description}${examples} |`
  }

  const allowedRows = allowed.map((r) => formatRow(r, '✅')).join('\n')
  const disallowedRows = disallowed.map((r) => formatRow(r, '❌')).join('\n')

  const header = `# Constraint Profile\n\nThese rules are architectural. They cannot be negotiated mid-session.\n\n| | Rule | Detail |\n|---|---|---|`
  const footer = `If a learner asks you to write code, decline clearly and redirect: tell them what concept to think about, what to read, or what question to ask themselves. Do not apologise for the constraint. It is the point.`

  return `${header}\n${allowedRows}\n${disallowedRows}\n\n${footer}`
}

const renderProjectSummary = (profile: ConstraintProfile): string => {
  const { project } = profile
  const artifacts = project.referenceArtifacts.map((a) => `- ${a}`).join('\n')

  return `# Project: ${project.title}\n\n${project.summary}\n\n**Reference artifacts available via read_file:**\n${artifacts}`
}

const renderPhaseCatalog = (profile: ConstraintProfile): string => {
  const phases = profile.project.phases

  const renderPhaseRow = (p: Phase, index: number): string =>
    `${index + 1}. **${p.id}** — ${p.title}\n   Concepts: ${p.conceptsIntroduced.join(', ')}`

  const rows = phases.map((p, i) => renderPhaseRow(p, i)).join('\n')

  return `# Phase Catalog\n\n${rows}`
}

const renderCurrentPhase = (profile: ConstraintProfile, context: LearnerContext): string => {
  const phase = profile.project.phases.find((p) => p.id === context.currentPhaseId)

  if (!phase) {
    return `# Current Phase\n\nPhase ID: ${context.currentPhaseId} (unknown — check config)`
  }

  const goals = phase.goals.map((g) => `- ${g}`).join('\n')
  const checkpoints = phase.checkpoints.map((c) => `- ${c}`).join('\n')
  const concepts = phase.conceptsIntroduced.join(', ')

  return `# Current Phase\n\n**${phase.id}** — ${phase.title}\n\n**Goals:**\n${goals}\n\n**Checkpoints:**\n${checkpoints}\n\n**Concepts introduced:** ${concepts}`
}

const renderFileTree = (context: LearnerContext): string =>
  `# Project File Tree\n\n\`\`\`\n${context.fileTree}\n\`\`\``

const renderRecentChanges = (context: LearnerContext): string => {
  if (context.recentChanges.length === 0) {
    return `# Recent Changes\n\nNo recent file changes.`
  }

  const lines = context.recentChanges.map((c) => `- [${c.kind}] ${c.path} at ${c.at}`).join('\n')

  return `# Recent Changes\n\n${lines}`
}
