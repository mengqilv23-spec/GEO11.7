import type {
  ContentBrief,
  ContentKnowledge,
  ContentProductionItem,
  ContentProductionStage,
  ProductionQuestion,
} from '../data/content-production-data'
import type { PlatformVerificationAnswer } from '../data/content-verification-data'
import { reactive } from 'vue'
import {
  buildBlogDraft,
  canVerifyContent,
  createPublishedVerificationItems,
  createSeedProductionItems,
  createVerificationQuestion,
  generateQuestionCandidates,
  runAiCheckFor,
  verifyQuestion,
} from '../data/content-production-data'
import { contentVerificationItems, contentVerificationRounds } from '../data/content-verification-data'
import { stripLeadingTitleHeading } from '../workflows/content-title'

const STORAGE_KEY = 'geo-content-production:v1'
const verificationDelay = import.meta.env.MODE === 'test' ? 0 : 650

interface ContentProductionState {
  items: ContentProductionItem[]
}

interface CreateFromBriefInput {
  brief: ContentBrief
  keyFacts: string[]
  knowledge?: ContentKnowledge[]
}

interface ImportContentInput {
  taskId?: string
  title: string
  body: string
  keyFacts: string[]
  url?: string
  brief?: Partial<ContentBrief>
}

function loadItems(): ContentProductionItem[] {
  if (typeof window === 'undefined')
    return createSeedProductionItems()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return createSeedProductionItems()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('items' in parsed) || !Array.isArray(parsed.items))
      return createSeedProductionItems()
    const stored = (parsed.items as ContentProductionItem[]).map(normalizeItem)
    // Persisted data may predate a seeded detection round. Add only the
    // published articles that are missing so every round keeps its own set.
    const storedTaskIds = new Set(stored.map(item => item.taskId).filter(Boolean))
    const missing = createPublishedVerificationItems().filter(item => !storedTaskIds.has(item.taskId))
    return [...missing, ...stored]
  }
  catch {
    return createSeedProductionItems()
  }
}

const verificationByTaskId = new Map(contentVerificationItems.map(item => [item.taskId, item]))

type LegacyQuestion = ProductionQuestion & { roundAnswers?: Record<string, PlatformVerificationAnswer[]> }

function legacyRoundAnswers(question?: ProductionQuestion): Record<string, PlatformVerificationAnswer[]> {
  return (question as LegacyQuestion | undefined)?.roundAnswers ?? {}
}

const retiredAiCheckKeys = new Set(['facts', 'evidence', 'structure'])
// Persisted checks may still contain retired rules; drop them and recompute
// the overall result so old drafts match the current check list.
function normalizeAiCheck(check: ContentProductionItem['aiCheck']) {
  if (!check)
    return check
  const items = check.items.filter(entry => !retiredAiCheckKeys.has(entry.key))
  return { ...check, items, passed: items.every(entry => entry.status === 'pass') }
}

function normalizeItem(item: ContentProductionItem): ContentProductionItem {
  // Older generated drafts repeated the title as the body's first heading.
  // The title now has its own field, so remove only that duplicated heading.
  const body = stripLeadingTitleHeading(item.body, [item.title, item.brief?.theme])
  // Older data modelled confirmation as a handoff to a separate customer
  // account. The single account now confirms in place, so pending and rejected
  // handoffs return to the same production steps.
  const persistedStage = item.stage as string
  const baseStage: ContentProductionStage = persistedStage === 'pending_client'
    ? (item.aiCheck?.passed ? 'ai_checked' : 'draft')
    : persistedStage === 'client_rejected' ? 'draft' : item.stage
  const keepsConfirmation = Boolean(item.publishedAt) || baseStage === 'ready_to_publish'
  const clientConfirmation = keepsConfirmation && item.clientConfirmation?.status === 'confirmed'
    ? item.clientConfirmation
    : undefined
  // A confirmation record only makes sense immediately before publishing. If
  // it is missing, keep the article in the step that produces it.
  const stage = baseStage === 'ready_to_publish' && !clientConfirmation
    ? (item.aiCheck?.passed ? 'ai_checked' : 'draft')
    : baseStage
  // Verified articles always mirror the monitoring source so every article
  // keeps the single detection round it was verified in.
  const canonical = item.taskId ? verificationByTaskId.get(item.taskId) : undefined
  if (canonical && stage === 'verified') {
    return {
      ...item,
      body,
      stage,
      roundId: canonical.roundId,
      keyFacts: item.keyFacts ?? [...canonical.keyFacts],
      aiCheck: normalizeAiCheck(item.aiCheck),
      clientConfirmation,
      questions: canonical.questions.map(question => ({ ...question, confirmed: true })),
    }
  }
  const latestRoundId = contentVerificationRounds.at(-1)?.id
  const rawQuestions = item.questions ?? []
  // Older persisted articles stored several rounds of answers on one question.
  // Keep the answers of the round the article belongs to and drop the rest.
  const legacyAnswers = legacyRoundAnswers(rawQuestions[0])
  const legacyRoundId = stage === 'verified'
    ? Object.keys(legacyAnswers).at(-1) ?? latestRoundId
    : undefined
  const roundId = item.roundId ?? legacyRoundId
  // Legacy data may carry several questions for one article; keep the single
  // verification question that belongs to the article.
  const questions = rawQuestions.slice(0, 1).map((question) => {
    const answers = (roundId ? legacyAnswers[roundId] : undefined) ?? question.answers ?? []
    return {
      id: question.id,
      question: question.question,
      intent: question.intent,
      state: answers.length ? 'cited' as const : question.state,
      answers,
      citationCount: answers.reduce((count, answer) => count + answer.citations.length, 0),
      primaryCitationCount: answers.reduce((count, answer) => count + answer.citations.filter(citation => citation.isPrimary).length, 0),
      confirmed: question.confirmed ?? true,
    }
  })
  const publishedPending = Boolean(item.publishedAt) && !['verifying', 'verified'].includes(stage)
  // Published articles offer AI candidates until the operator selects one.
  // Legacy auto-generated questions were never an explicit choice, so they
  // only survive when already confirmed.
  const questionCandidates = publishedPending
    ? (item.questionCandidates?.length ? item.questionCandidates : generateQuestionCandidates(item))
    : item.questionCandidates
  const selectedQuestions = publishedPending && !questions[0]?.confirmed ? [] : questions
  const finalStage = publishedPending
    ? (selectedQuestions[0]?.confirmed ? 'questions_confirmed' : 'questions_pending')
    : stage
  return {
    ...item,
    body,
    stage: finalStage,
    roundId,
    keyFacts: item.keyFacts ?? [],
    aiCheck: normalizeAiCheck(item.aiCheck),
    clientConfirmation,
    questions: selectedQuestions,
    questionCandidates,
  }
}

const state = reactive<ContentProductionState>({ items: loadItems() })

function persist() {
  if (typeof window === 'undefined')
    return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: state.items }))
  }
  catch {
    // The prototype remains usable when storage is unavailable.
  }
}

function now() {
  return new Date().toISOString()
}

function nextItemId() {
  const max = state.items.reduce((current, item) => {
    const match = item.id.match(/^CV-(\d+)$/)
    return match ? Math.max(current, Number(match[1])) : current
  }, 2600)
  return `CV-${max + 1}`
}

function findItem(itemId: string) {
  return state.items.find(item => item.id === itemId)
}

function touch(item: ContentProductionItem) {
  item.updatedAt = now()
  persist()
}

function normalizeFacts(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))]
}

function createFromBrief(input: CreateFromBriefInput) {
  const keyFacts = normalizeFacts(input.keyFacts)
  const draft = buildBlogDraft({ ...input.brief, keyFacts })
  const item: ContentProductionItem = {
    id: nextItemId(),
    title: draft.title,
    slug: draft.slug,
    summary: draft.summary,
    body: draft.body,
    keyFacts,
    brief: { ...input.brief },
    knowledge: input.knowledge?.length ? input.knowledge.map(item => ({ ...item })) : undefined,
    stage: 'draft',
    source: 'ai',
    createdAt: now(),
    updatedAt: now(),
    revision: 0,
    questions: [],
  }
  state.items.unshift(item)
  persist()
  return item
}

function importContent(input: ImportContentInput) {
  const keyFacts = normalizeFacts(input.keyFacts)
  const title = input.title.trim()
  const url = input.url?.trim()
  const brief: ContentBrief = {
    theme: title,
    targetQuestion: '',
    audience: '',
    market: '德国',
    notes: '',
    ...input.brief,
  }
  const item: ContentProductionItem = {
    id: nextItemId(),
    taskId: input.taskId,
    title,
    slug: url ? slugFromUrl(url) : slugFromTitle(title),
    summary: summaryFromBody(input.body, title),
    body: input.body.trim(),
    keyFacts,
    brief,
    stage: url ? 'questions_pending' : 'ready_to_publish',
    source: url ? 'imported' : 'upload',
    createdAt: now(),
    updatedAt: now(),
    publishedAt: url ? now() : undefined,
    url,
    revision: 1,
    aiCheck: runAiCheckFor({ title, body: input.body, keyFacts, brief }),
    clientConfirmation: { status: 'confirmed', at: now(), comment: url ? '已发布内容导入，登记线上地址。' : '上传成稿，视为已确认。' },
    questions: [],
  }
  if (url)
    item.questionCandidates = generateQuestionCandidates(item)
  state.items.unshift(item)
  persist()
  return item
}

function updateDraft(itemId: string, patch: { title?: string, summary?: string, body?: string, keyFacts?: string[] }) {
  const item = findItem(itemId)
  if (!item || !['draft', 'ai_checked', 'ready_to_publish'].includes(item.stage))
    return
  if (patch.title !== undefined)
    item.title = patch.title
  if (patch.summary !== undefined)
    item.summary = patch.summary
  if (patch.body !== undefined)
    item.body = patch.body
  if (patch.keyFacts !== undefined)
    item.keyFacts = normalizeFacts(patch.keyFacts)
  // The check and confirmation describe the previous body. Any edit must run
  // through checking and confirmation again, including edits made after the
  // content was confirmed and before it is published.
  item.aiCheck = undefined
  item.clientConfirmation = undefined
  item.publishError = undefined
  item.stage = 'draft'
  touch(item)
}

function runAiCheck(itemId: string) {
  const item = findItem(itemId)
  if (!item || !['draft', 'ai_checked'].includes(item.stage))
    return
  item.aiCheck = runAiCheckFor(item)
  // Only a passed check moves the article to confirmation. A failed check stays
  // in progress so the operator edits and checks again.
  item.stage = item.aiCheck.passed ? 'ai_checked' : 'draft'
  touch(item)
}

function confirmContent(itemId: string, comment = '') {
  const item = findItem(itemId)
  if (!item || item.stage !== 'ai_checked' || !item.aiCheck?.passed)
    return
  item.clientConfirmation = { status: 'confirmed', at: now(), comment: comment.trim() || '内容已确认。' }
  item.publishError = undefined
  item.stage = 'ready_to_publish'
  touch(item)
}

interface PublishOptions {
  simulateFailure?: boolean
}

const PUBLISH_FAILURE_REASON = '官网 Blog 未返回成功状态，请修改内容后重新发布。'

function publish(itemId: string, options: PublishOptions = {}) {
  const item = findItem(itemId)
  if (!item || item.publishedAt || item.stage !== 'ready_to_publish')
    return false
  if (item.clientConfirmation?.status !== 'confirmed')
    return false
  if (options.simulateFailure) {
    // Publishing only returns a status, so a failed attempt sends the content
    // back to review with the reason instead of recording a publish.
    item.publishError = PUBLISH_FAILURE_REASON
    item.clientConfirmation = undefined
    item.stage = item.aiCheck?.passed ? 'ai_checked' : 'draft'
    touch(item)
    return false
  }
  item.publishError = undefined
  item.publishedAt = now()
  item.stage = 'questions_pending'
  item.questions = []
  item.questionCandidates = generateQuestionCandidates(item)
  touch(item)
  return true
}

function updateQuestion(itemId: string, questionId: string, patch: { question?: string, intent?: string, confirmed?: boolean }) {
  const item = findItem(itemId)
  if (!item || ['verifying', 'verified'].includes(item.stage))
    return
  const question = item.questions.find(entry => entry.id === questionId)
  if (!question)
    return
  if (patch.question !== undefined)
    question.question = patch.question
  if (patch.intent !== undefined)
    question.intent = patch.intent
  if (patch.confirmed !== undefined)
    question.confirmed = patch.confirmed
  syncQuestionStage(item)
  touch(item)
}

function addQuestion(itemId: string) {
  const item = findItem(itemId)
  if (!item || !item.publishedAt || ['verifying', 'verified'].includes(item.stage))
    return
  const nextIndex = item.questions.length + 1
  item.questions.push({
    id: `${item.id}-Q${nextIndex}-${Date.now().toString(36)}`,
    question: '新的核验问题',
    intent: '自定义问题',
    state: 'pending',
    answers: [],
    citationCount: 0,
    primaryCitationCount: 0,
    confirmed: false,
  })
  syncQuestionStage(item)
  touch(item)
}

function removeQuestion(itemId: string, questionId: string) {
  const item = findItem(itemId)
  if (!item || ['verifying', 'verified'].includes(item.stage))
    return
  item.questions = item.questions.filter(question => question.id !== questionId)
  syncQuestionStage(item)
  touch(item)
}

function confirmAllQuestions(itemId: string) {
  const item = findItem(itemId)
  if (!item || !item.publishedAt || ['verifying', 'verified'].includes(item.stage))
    return
  item.questions.forEach((question) => {
    question.confirmed = true
  })
  syncQuestionStage(item)
  touch(item)
}

function selectQuestion(itemId: string, value: string) {
  const item = findItem(itemId)
  if (!item || !item.publishedAt || ['verifying', 'verified'].includes(item.stage))
    return
  const question = value.trim()
  // An article is verified against exactly one question; selecting another
  // candidate replaces the previous choice.
  item.questions = question ? [createVerificationQuestion(item.id, question)] : []
  item.stage = question ? 'questions_confirmed' : 'questions_pending'
  touch(item)
}

function syncQuestionStage(item: ContentProductionItem) {
  if (['verifying', 'verified'].includes(item.stage))
    return
  if (item.questions.length && item.questions.every(question => question.confirmed))
    item.stage = 'questions_confirmed'
  else if (item.publishedAt)
    item.stage = 'questions_pending'
}

async function startVerification(itemId: string) {
  const item = findItem(itemId)
  if (!item || !item.publishedAt || !canVerifyContent(item))
    return
  const confirmed = item.questions.filter(question => question.confirmed)
  if (!confirmed.length || confirmed.length !== item.questions.length)
    return
  item.stage = 'verifying'
  persist()
  await new Promise(resolve => setTimeout(resolve, verificationDelay))
  // A newly verified article joins the current (latest) detection round. An
  // article that already belongs to a round keeps that round on re-verification.
  item.roundId = item.roundId ?? contentVerificationRounds.at(-1)?.id
  item.questions = item.questions.map(question => question.confirmed ? verifyQuestion(item, question) : question)
  item.lastChecked = now()
  item.stage = 'verified'
  touch(item)
}

function resetContentProductionStore() {
  state.items = createSeedProductionItems()
  persist()
}

function slugFromTitle(title: string) {
  const ascii = title
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return ascii || `blog-${Date.now().toString(36)}`
}

function slugFromUrl(value: string) {
  try {
    return new URL(value).pathname.split('/').filter(Boolean).at(-1) ?? 'blog'
  }
  catch {
    return 'blog'
  }
}

function summaryFromBody(body: string, fallback: string) {
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, 120) || fallback
}

export function useContentProductionStore() {
  return {
    state,
    findItem,
    createFromBrief,
    importContent,
    updateDraft,
    runAiCheck,
    confirmContent,
    publish,
    updateQuestion,
    addQuestion,
    removeQuestion,
    confirmAllQuestions,
    selectQuestion,
    startVerification,
  }
}

export { resetContentProductionStore }
