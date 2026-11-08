<script setup lang="ts">
import { Color, TextStyle } from '@tiptap/extension-text-style'
import { Mark, type Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  editable?: boolean
  label?: string
  heading?: string
  fullWidth?: boolean
  aiOptimize?: boolean
  aiCallsRemaining?: number
  externalClaims?: Array<{ id: string, text: string, source: string, confirmed: boolean }>
  canConfirmExternalClaims?: boolean
}>(), {
  editable: true,
  label: '内容正文',
  heading: '',
  fullWidth: false,
  aiOptimize: false,
  aiCallsRemaining: 2,
  externalClaims: () => [],
  canConfirmExternalClaims: false,
})
const emit = defineEmits<{ 'update:modelValue': [value: string], 'ai-call': [], 'confirm-external-claim': [id: string] }>()

function editorContent(value: string) {
  if (!value)
    return '<p></p>'
  if (/<(?:p|h[1-6]|ul|ol|blockquote|div)\b/i.test(value))
    return value
  return value.split('\n').map(line => `<p>${line.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') || '<br>'}</p>`).join('')
}

const ExternalClaim = Mark.create({
  name: 'externalClaim',
  addAttributes() { return { id: { default: null, parseHTML: element => element.getAttribute('data-external-claim-id'), renderHTML: attributes => ({ 'data-external-claim-id': attributes.id }) } } },
  parseHTML() { return [{ tag: 'span[data-external-claim-id]' }] },
  renderHTML({ HTMLAttributes }) { return ['span', { ...HTMLAttributes, class: 'task-external-claim' }, 0] },
})

const editor = useEditor({
  content: editorContent(props.modelValue),
  editable: props.editable,
  extensions: [StarterKit.configure({ link: false, italic: { HTMLAttributes: { class: 'task-rich-italic' } } }), TextStyle, Color.configure({ types: ['textStyle'] }), ExternalClaim],
  onUpdate: ({ editor: currentEditor }) => emit('update:modelValue', currentEditor.getHTML()),
  onSelectionUpdate: ({ editor: currentEditor }) => updateSelection(currentEditor),
  onCreate: () => { void nextTick(syncClaimAppearance) },
})

const editorRoot = ref<HTMLElement | null>(null)
const hasSelection = ref(false)
const bubblePosition = ref({ left: 0, top: 0 })
const bubbleVisible = computed(() => props.editable && hasSelection.value && !aiPanelOpen.value)
const activeClaimId = ref<string | null>(null)
const claimPosition = ref({ left: 12, top: 12 })
const activeClaim = computed(() => props.externalClaims.find(claim => claim.id === activeClaimId.value))
const visibleClaims = computed(() => props.externalClaims.filter(claim => props.modelValue.includes(`data-external-claim-id="${claim.id}"`)))
const pendingClaimCount = computed(() => visibleClaims.value.filter(claim => !claim.confirmed).length)

function onContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const claim = target.closest<HTMLElement>('[data-external-claim-id]')
  activeClaimId.value = claim?.dataset.externalClaimId || null
  if (claim && editorRoot.value) {
    const rect = claim.getBoundingClientRect()
    const root = editorRoot.value.getBoundingClientRect()
    claimPosition.value = { left: Math.max(12, Math.min(rect.left - root.left, root.width - 300)), top: rect.bottom - root.top + 8 }
  }
}

function updateSelection(current: Editor) {
  const selection = current.state.selection
  hasSelection.value = !selection.empty && Boolean(current.state.doc.textBetween(selection.from, selection.to, ' ').trim())
  if (!hasSelection.value || !editorRoot.value)
    return
  try {
    const start = current.view.coordsAtPos(selection.from)
    const end = current.view.coordsAtPos(selection.to)
    const root = editorRoot.value.getBoundingClientRect()
    bubblePosition.value = {
      left: Math.max(84, Math.min((start.left + end.right) / 2 - root.left, root.width - 84)),
      top: Math.max(8, Math.min(start.top, end.top) - root.top - 46),
    }
  }
  catch {
    bubblePosition.value = { left: 160, top: 8 }
  }
}

const aiPanelOpen = ref(false)
const aiPreviewOpen = ref(false)
const aiInstruction = ref('')
const selectedText = ref('')
const previewText = ref('')
const selectionRange = ref<{ from: number, to: number } | null>(null)
const optimizationScope = ref<'paragraph' | 'article'>('paragraph')
const aiError = ref('')

watch(() => props.modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML())
    editor.value.commands.setContent(editorContent(value), { emitUpdate: false })
})
watch(() => props.editable, value => editor.value?.setEditable(value))
function syncClaimAppearance() {
  const claims = props.externalClaims
  editorRoot.value?.querySelectorAll<HTMLElement>('[data-external-claim-id]').forEach((element) => {
    element.classList.toggle('is-confirmed', Boolean(claims.find(claim => claim.id === element.dataset.externalClaimId)?.confirmed))
  })
}
onMounted(() => { void nextTick(syncClaimAppearance) })
watch(() => props.externalClaims, async () => {
  await nextTick()
  syncClaimAppearance()
}, { deep: true, immediate: true })

function run(command: 'bold' | 'italic' | 'underline' | 'bulletList' | 'orderedList' | 'blockquote' | 'undo' | 'redo' | 'heading' | 'paragraph') {
  if (!editor.value)
    return
  const chain = editor.value.chain().focus()
  if (command === 'heading')
    chain.toggleHeading({ level: 2 }).run()
  else if (command === 'paragraph')
    chain.setParagraph().run()
  else if (command === 'bold')
    chain.toggleBold().run()
  else if (command === 'italic')
    chain.toggleItalic().run()
  else if (command === 'underline')
    chain.toggleUnderline().run()
  else if (command === 'bulletList')
    chain.toggleBulletList().run()
  else if (command === 'orderedList')
    chain.toggleOrderedList().run()
  else if (command === 'blockquote')
    chain.toggleBlockquote().run()
  else if (command === 'undo')
    chain.undo().run()
  else
    chain.redo().run()
}

const controls = [
  { label: '加粗', command: 'bold', mark: 'bold' },
  { label: '斜体', command: 'italic', mark: 'italic' },
  { label: '下划线', command: 'underline', mark: 'underline' },
  { label: '二级标题', command: 'heading', mark: 'heading' },
  { label: '正文', command: 'paragraph', mark: 'paragraph' },
  { label: '项目符号列表', command: 'bulletList', mark: 'bulletList' },
  { label: '编号列表', command: 'orderedList', mark: 'orderedList' },
  { label: '引用', command: 'blockquote', mark: 'blockquote' },
] as const

function setTextColor(event: Event) {
  const color = (event.target as HTMLInputElement).value
  editor.value?.chain().focus().setColor(color).run()
}

function focusEditor() {
  editor.value?.commands.focus()
}

function openAiOptimize(scope: 'paragraph' | 'article' = 'paragraph') {
  const current = editor.value
  if (!current)
    return
  const selection = current.state.selection
  if (scope === 'article') {
    selectionRange.value = { from: 0, to: current.state.doc.content.size }
    selectedText.value = current.getText({ blockSeparator: '\n\n' })
  }
  else if (!selection.empty) {
    selectionRange.value = { from: selection.from, to: selection.to }
    selectedText.value = current.state.doc.textBetween(selection.from, selection.to, '\n')
  }
  else {
    return
  }
  aiError.value = ''
  optimizationScope.value = scope
  aiInstruction.value = ''
  previewText.value = selectedText.value
  aiPreviewOpen.value = false
  aiPanelOpen.value = true
}

function useSuggestion(value: string) {
  aiInstruction.value = aiInstruction.value ? `${aiInstruction.value}；${value}` : value
}

function generatePreview() {
  if (props.aiCallsRemaining <= 0) {
    aiError.value = '本篇内容在当前角色下的 AI 优化次数已用完。'
    aiPreviewOpen.value = false
    return
  }
  emit('ai-call')
  // This prototype exposes the complete review flow without invoking a generation service.
  previewText.value = selectedText.value
  aiError.value = ''
  aiPreviewOpen.value = true
}

function replaceSelectedText() {
  const current = editor.value
  const range = selectionRange.value
  if (!current || !range || !previewText.value.trim())
    return
  if (optimizationScope.value === 'article') {
    current.commands.setContent(editorContent(previewText.value))
  }
  else {
    current.chain().focus().insertContentAt(range, previewText.value).run()
  }
  aiPanelOpen.value = false
  aiPreviewOpen.value = false
  selectionRange.value = null
}

defineExpose({ focusEditor })
</script>

<template>
  <section class="task-rich-editor" :class="{ 'is-editable': editable, 'has-ai-dock': aiOptimize || Boolean($slots.aiDockBelow || $slots['ai-dock-below']) }" :aria-label="label">
    <div ref="editorRoot" class="task-rich-editor__writing">
      <div v-if="editable" class="task-rich-editor__toolbar" role="toolbar" aria-label="正文格式">
      <button
        v-for="control in controls"
        :key="control.command"
        type="button"
        :aria-label="control.label"
        :aria-pressed="editor?.isActive(control.mark) ?? false"
        :title="control.label"
        :aria-keyshortcuts="control.command === 'bold' ? 'Control+B Meta+B' : control.command === 'italic' ? 'Control+I Meta+I' : control.command === 'underline' ? 'Control+U Meta+U' : undefined"
        @mousedown.prevent
        @click="run(control.command)"
      >
        {{ control.command === 'heading' ? '标题' : control.command === 'paragraph' ? '正文' : control.command === 'bold' ? 'B' : control.command === 'italic' ? 'I' : control.command === 'underline' ? 'U' : control.command === 'bulletList' ? '• 列表' : control.command === 'orderedList' ? '1. 列表' : '引用' }}
      </button>
      <span class="task-rich-editor__divider" aria-hidden="true" />
      <button type="button" aria-label="撤销" title="撤销（⌘/Ctrl+Z）" aria-keyshortcuts="Control+Z Meta+Z" @mousedown.prevent @click="run('undo')">
        ↶
      </button>
      <button type="button" aria-label="重做" title="重做（⌘/Ctrl+Shift+Z）" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z" @mousedown.prevent @click="run('redo')">
        ↷
      </button>
      <label class="task-rich-editor__color" title="选择文字颜色">
        <span aria-hidden="true">A</span>
        <input type="color" aria-label="文字颜色" value="#1D2129" @input="setTextColor">
      </label>
      </div>
      <div v-if="bubbleVisible" class="task-rich-editor__bubble" :style="{ left: `${bubblePosition.left}px`, top: `${bubblePosition.top}px` }" role="toolbar" aria-label="选中文字操作" data-test="selection-bubble">
      <button type="button" aria-label="选中文字加粗" @mousedown.prevent @click="run('bold')">B</button>
      <button type="button" aria-label="选中文字斜体" @mousedown.prevent @click="run('italic')"><em>I</em></button>
      <span v-if="aiOptimize" aria-hidden="true" />
      <button v-if="aiOptimize" type="button" data-test="bubble-ai-optimize" :disabled="aiCallsRemaining <= 0" :title="aiCallsRemaining <= 0 ? 'AI 次数已用完' : 'AI 润色'" @mousedown.prevent @click="openAiOptimize('paragraph')">✦ AI 润色</button>
    </div>
      <article class="task-rich-editor__page" :class="{ 'is-full-width': fullWidth }">
        <h1 v-if="heading">
          {{ heading }}
        </h1>
        <EditorContent :editor="editor" class="task-rich-editor__content" @click="onContentClick" />
      </article>
      <div v-if="activeClaim && !activeClaim.confirmed && canConfirmExternalClaims" class="task-rich-editor__claim-action" :style="{ left: `${claimPosition.left}px`, top: `${claimPosition.top}px` }" data-test="external-claim-action">
        <button type="button" aria-label="确认这条联网信息准确" @click="emit('confirm-external-claim', activeClaim.id); activeClaimId = null">确认准确</button>
      </div>
    </div>
    <aside v-if="aiOptimize || $slots.aiDockBelow || $slots['ai-dock-below']" class="task-rich-editor__ai-dock" :aria-label="aiOptimize ? 'AI 写作及质检' : 'AI 质检'">
      <template v-if="aiOptimize">
      <header class="task-rich-editor__ai-dock-head">
        <strong>AI 写作</strong>
        <span>剩余 {{ aiCallsRemaining }} 次</span>
      </header>
      <button type="button" class="task-rich-editor__ai-dock-action" data-test="open-ai-optimize" :disabled="!hasSelection || aiCallsRemaining <= 0" title="请先选中正文" @click="openAiOptimize('paragraph')">✦ 优化选中段落</button>
      <button type="button" class="task-rich-editor__ai-dock-action is-danger" data-test="regenerate-article" :disabled="aiCallsRemaining <= 0" @click="openAiOptimize('article')">⚠ 重新生成全文</button>
      <section v-if="aiPanelOpen" class="task-rich-editor__ai-panel" data-test="ai-optimize-panel" aria-label="段落 AI 优化">
      <header class="task-rich-editor__ai-head">
        <div><strong>{{ optimizationScope === 'article' ? '重新生成文章' : '优化选中内容' }}</strong><span>{{ optimizationScope === 'article' ? '沿用当前任务策略、Brief 和已确认事实生成新稿' : '保留原意和事实，仅调整选中段落' }}</span></div>
        <button type="button" aria-label="关闭 AI 优化" @click="aiPanelOpen = false">×</button>
      </header>
      <p v-if="aiError" class="task-rich-editor__ai-error" role="alert">{{ aiError }}</p>
      <template v-else>
        <p v-if="optimizationScope === 'article'" class="task-rich-editor__ai-warning" role="note">重新生成将替换整篇正文。生成后可在预览中决定是否替换。</p>
        <div class="task-rich-editor__ai-source"><span>{{ optimizationScope === 'article' ? '当前文章' : '当前段落' }}</span><p>{{ selectedText }}</p></div>
        <label class="task-rich-editor__ai-label" for="task-ai-instruction">优化要求（选填）</label>
        <textarea id="task-ai-instruction" v-model="aiInstruction" rows="2" placeholder="可补充希望调整的方向；留空则按当前任务要求优化。" />
        <div class="task-rich-editor__ai-suggestions" aria-label="常用优化方向">
          <button type="button" @click="useSuggestion('表达更专业')">表达更专业</button>
          <button type="button" @click="useSuggestion('突出产品优势')">突出产品优势</button>
          <button type="button" @click="useSuggestion('补充专家视角')">补充专家视角</button>
        </div>
        <div class="task-rich-editor__ai-foot">
          <small>本次优化会计入内容生成额度</small>
          <button type="button" class="task-rich-editor__ai-generate" data-test="generate-ai-preview" :disabled="aiCallsRemaining <= 0" @click="generatePreview">生成优化稿 · 剩余 {{ aiCallsRemaining }} 次</button>
        </div>
        <div v-if="aiPreviewOpen" class="task-rich-editor__ai-preview" data-test="ai-optimize-preview">
          <div class="task-rich-editor__ai-preview-head"><strong>优化稿预览</strong></div>
          <textarea v-model="previewText" rows="4" aria-label="优化稿预览内容" />
          <div class="task-rich-editor__ai-preview-actions">
            <button type="button" @click="aiPanelOpen = false">保留原文</button>
            <button type="button" class="task-rich-editor__ai-generate" data-test="replace-selected-text" :disabled="!previewText.trim()" @click="replaceSelectedText">{{ optimizationScope === 'article' ? '替换全文' : '替换选中内容' }}</button>
          </div>
        </div>
      </template>
      </section>
      <p v-if="visibleClaims.length" class="task-rich-editor__claim-summary" data-test="external-claim-summary">正文中标出了待核实的联网品牌信息<span v-if="pendingClaimCount"> · {{ pendingClaimCount }} 处待确认</span><span v-else> · 已全部确认</span></p>
      </template>
      <slot name="ai-dock-below" />
    </aside>
  </section>
</template>

<style scoped>
.task-rich-editor {
  position: relative;
  border: 1px solid var(--border, #dce3ef);
  border-radius: 10px;
  background: #fff;
}

.task-rich-editor.has-ai-dock { display:grid; grid-template-columns:minmax(0,1fr) minmax(250px,300px); align-items:start; gap:16px; border:0; background:transparent; }
.task-rich-editor__writing { position:relative; min-width:0; }
.task-rich-editor__ai-dock { position:sticky; top:16px; display:grid; min-width:0; align-content:start; gap:9px; padding:14px; border:1px solid var(--border-default,#dce3ef); border-radius:12px; background:var(--background-primary,#fff); }
.task-rich-editor__ai-dock-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-bottom:3px; }
.task-rich-editor__ai-dock-head strong { color:var(--text-primary,#1d2129); font-size:15px; }
.task-rich-editor__ai-dock-head span { color:var(--text-muted,#77849a); font-size:11px; white-space:nowrap; }
.task-rich-editor__ai-dock-action { min-height:36px; padding:7px 10px; border:1px solid var(--border-default,#dce3ef); border-radius:8px; background:var(--background-primary,#fff); color:var(--action-accent,#4152f6); font:inherit; font-size:12px; font-weight:600; text-align:left; cursor:pointer; }
.task-rich-editor__ai-dock-action:hover:not(:disabled) { background:var(--action-subtle-background,#f2f3fd); }
.task-rich-editor__ai-dock-action.is-danger { color:#a84b32; }
.task-rich-editor__ai-dock-action:disabled { opacity:.48; cursor:not-allowed; }

.task-rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border-bottom: 1px solid var(--border, #e4e9f1);
  background: #f8faff;
}

.task-rich-editor__toolbar button {
  display: inline-grid;
  min-width: 28px;
  min-height: 32px;
  flex-shrink: 0;
  padding: 0 6px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4c5a70;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
}

.task-rich-editor__toolbar button:hover,
.task-rich-editor__toolbar button[aria-pressed="true"] {
  background: var(--action-subtle-background, #f2f3fd);
  color: var(--action-accent);
}

.task-rich-editor__toolbar button:focus-visible {
  outline: 2px solid var(--action-accent);
  outline-offset: 1px;
}

.task-rich-editor__divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: #dce3ef;
}

.task-rich-editor__toolbar button:disabled { opacity: .45; cursor: not-allowed; }
.task-rich-editor__bubble { position: absolute; z-index: 30; display: flex; align-items: center; gap: 2px; transform: translateX(-50%); padding: 4px; border-radius: 7px; background: #222936; color: #fff; box-shadow: 0 7px 22px rgb(20 28 45 / 25%); white-space: nowrap; }
.task-rich-editor__bubble button { min-height: 27px; padding: 0 8px; border: 0; border-radius: 4px; background: transparent; color: inherit; font: inherit; font-size: 12px; cursor: pointer; }
.task-rich-editor__bubble button:hover { background: #3b465b; }
.task-rich-editor__bubble button:disabled { opacity: .4; cursor: not-allowed; }
.task-rich-editor__bubble > span { width: 1px; height: 17px; background: #596275; }
.task-rich-editor__ai-warning { margin: 0; padding: 9px 10px; border: 1px solid #f5d8a9; border-radius: 7px; background: #fff9ed; color: #956113; font-size: 12px; }
.task-rich-editor__claim-summary { margin: 12px 16px 0; color: #946013; font-size: 12px; }
.task-rich-editor__content :deep(.task-external-claim) { border-bottom: 2px solid #d89422; background: #fff3d7; cursor: pointer; }
.task-rich-editor__content :deep(.task-external-claim)::after { margin-left: 3px; padding: 1px 4px; border-radius: 4px; background: #fff0cc; color: #9b6312; content: '待核实'; font-size: 10px; white-space: nowrap; }
.task-rich-editor__content :deep(.task-external-claim.is-confirmed) { border-bottom-color: #93cbb0; background: #ecf8f1; }
.task-rich-editor__content :deep(.task-external-claim.is-confirmed)::after { background: #e3f6eb; color: #1c8d52; content: '已确认'; }
.task-rich-editor__claim-action { position: absolute; z-index: 35; }
.task-rich-editor__claim-action button { padding: 5px 9px; border: 1px solid #e8c787; border-radius: 6px; background: #fff; color: #946013; font: inherit; font-size: 12px; cursor: pointer; box-shadow: 0 4px 12px rgb(28 36 64 / 10%); }
.task-rich-editor__ai-panel { display: grid; gap: 10px; margin: 4px 0 0; padding: 12px; border: 1px solid #dce2f0; border-radius: 10px; background: #fbfcff; }
.task-rich-editor__ai-head, .task-rich-editor__ai-foot, .task-rich-editor__ai-preview-head, .task-rich-editor__ai-preview-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.task-rich-editor__ai-head > div { display: grid; gap: 2px; }
.task-rich-editor__ai-head strong, .task-rich-editor__ai-preview-head strong { color: #1d2129; font-size: 13px; }
.task-rich-editor__ai-head span, .task-rich-editor__ai-preview-head span, .task-rich-editor__ai-foot small { color: #77849a; font-size: 11px; }
.task-rich-editor__ai-head > button { border: 0; background: transparent; color: #77849a; font-size: 20px; cursor: pointer; }
.task-rich-editor__ai-source { padding: 9px 10px; border-radius: 7px; background: #f1f3f8; }
.task-rich-editor__ai-source span, .task-rich-editor__ai-label { color: #77849a; font-size: 11px; font-weight: 600; }
.task-rich-editor__ai-source p { max-height: 54px; margin: 3px 0 0; overflow: auto; color: #46546a; font-size: 12px; line-height: 18px; white-space: pre-wrap; }
.task-rich-editor__ai-label { margin-bottom: -6px; }
.task-rich-editor__ai-panel textarea { box-sizing: border-box; width: 100%; resize: vertical; padding: 8px 10px; border: 1px solid #dce3ef; border-radius: 7px; background: white; color: #1d2129; font: inherit; font-size: 12px; line-height: 18px; }
.task-rich-editor__ai-suggestions { display: flex; flex-wrap: wrap; gap: 6px; }
.task-rich-editor__ai-suggestions button, .task-rich-editor__ai-preview-actions > button:first-child { min-height: 27px; padding: 3px 9px; border: 1px solid #dce3ef; border-radius: 999px; background: white; color: #53627a; font: inherit; font-size: 11px; cursor: pointer; }
.task-rich-editor__ai-generate { min-height: 30px; padding: 4px 11px; border: 1px solid var(--action-accent); border-radius: 7px; background: var(--action-accent); color: white; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.task-rich-editor__ai-generate:disabled { opacity: .45; cursor: not-allowed; }
.task-rich-editor__ai-error { margin: 0; color: #c34539; font-size: 12px; }
.task-rich-editor__ai-preview { display: grid; gap: 8px; padding-top: 10px; border-top: 1px solid #e6eaf2; }
.task-rich-editor__ai-preview-actions { justify-content: flex-end; }

.task-rich-editor__color {
  position: relative;
  display: inline-flex;
  width: 34px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--text-primary, #1d2129);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.task-rich-editor__color::after {
  position: absolute;
  right: 8px;
  bottom: 4px;
  left: 8px;
  height: 3px;
  border-radius: 2px;
  background: var(--action-accent, #4152f6);
  content: '';
}

.task-rich-editor__color:hover { background: var(--action-subtle-background, #f2f3fd); }
.task-rich-editor__color input { position: absolute; width: 1px; height: 1px; opacity: 0; }

.task-rich-editor__content :deep(.ProseMirror) {
  min-height: 100%;
  margin: 0;
  padding: 12px 56px 48px;
  background: transparent;
  color: var(--text, #29364b);
  font-size: 16px;
  line-height: 1.8;
  outline: none;
}

.task-rich-editor__page { max-width: 880px; margin: 24px auto; border: 1px solid var(--border, #e5e6eb); border-radius: 12px; background:#fff; box-shadow:0 1px 3px rgb(29 33 41 / 5%); }
.task-rich-editor__page.is-full-width { display:flex; width:100%; max-width:none; height:clamp(420px,62vh,680px); min-height:0; flex-direction:column; margin:16px 0 0; overflow:hidden; }
.task-rich-editor__page.is-full-width .task-rich-editor__content { min-height:0; flex:1; overflow-y:auto; overscroll-behavior:contain; }
.task-rich-editor__page:has(.ProseMirror:focus-visible) { border-color:var(--focus-ring, #4152f6); box-shadow:0 0 0 2px rgb(65 82 246 / 12%); }
.task-rich-editor__page > h1 { margin:0; padding:40px 56px 8px; color:var(--text-primary, #1d2129); font-size:26px; line-height:1.35; }
.task-rich-editor__content :deep(.ProseMirror h1) { font-size: 1.7em; line-height: 1.3; }
.task-rich-editor__content :deep(.ProseMirror h2) { font-size: 1.35em; line-height: 1.4; }
.task-rich-editor__content :deep(.ProseMirror em.task-rich-italic) { font-style: italic; font-style: oblique 12deg; font-synthesis: style; }

.task-rich-editor__content :deep(.ProseMirror > :first-child) {
  margin-top: 0;
}

.task-rich-editor__content :deep(.ProseMirror > :last-child) {
  margin-bottom: 0;
}

.task-rich-editor__content :deep(.ProseMirror h2) {
  margin: 1.2em 0 0.5em;
  font-size: 1.15em;
}

.task-rich-editor__content :deep(.ProseMirror ul),
.task-rich-editor__content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
}

.task-rich-editor__content :deep(.ProseMirror blockquote) {
  margin-left: 0;
  padding-left: 12px;
  border-left: 3px solid #b9c8fb;
  color: #687790;
}

/* The task workspace is narrower than the viewport because of its sidebar.
   Stack against the actual writing area, not just the browser width. */
@container task-output (max-width: 1030px) {
  .task-rich-editor.has-ai-dock { grid-template-columns:minmax(0,1fr); }
  .task-rich-editor__ai-dock { position:static; }
}
@media (max-width: 1180px) {
  .task-rich-editor.has-ai-dock { grid-template-columns:minmax(0,1fr); }
  .task-rich-editor__ai-dock { position:static; }
}
@media (max-width: 760px) {
  .task-rich-editor__page.is-full-width { height:min(56vh,560px); min-height:360px; }
  .task-rich-editor__page { margin:12px; }
  .task-rich-editor__page > h1 { padding:24px 20px 8px; font-size:22px; }
  .task-rich-editor__content :deep(.ProseMirror) { padding:8px 20px 24px; }
  .task-rich-editor__shortcut-hint { width: 100%; margin-left: 0; }
}
</style>

