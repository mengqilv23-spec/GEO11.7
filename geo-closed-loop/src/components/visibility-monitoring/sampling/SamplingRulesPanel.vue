<script setup lang="ts">
defineProps<{ open?: boolean }>()
</script>

<template>
  <details class="vm-rules" :open="open">
    <summary>查看采样口径与判定规则</summary>
    <div class="vm-rules__body">
      <p><strong>会话：</strong>每次采样使用全新会话，不带登录态与个性化历史。</p><p><strong>地区与语言：</strong>按本轮监测市场与语言执行统一采样。</p><p><strong>采集方式：</strong>模拟用户方式采集，记录用户实际看到的回答。</p><p><strong>频率：</strong>按当前监测配置执行，本期按周计划监测。</p><p><strong>判定：</strong>统一判定品牌提及、推荐、引用与情感，周期内口径保持一致。</p><p><strong>失败处理：</strong>无有效回答不计入分母；有效返回不足时标记样本不足。</p><p class="vm-demo-disclaimer">
        演示数据：本页面展示的是静态样例，不代表当前实时采样结果。
      </p>
    </div>
  </details>
</template>

<style scoped>
.vm-rules { margin-top: 20px; background: var(--background-primary); border: 1px solid var(--border-default); border-radius: 12px; }
.vm-rules summary { padding: 14px 18px; color: var(--action-accent); font-weight: 600; cursor: pointer; }
.vm-rules summary:focus-visible { outline: 2px solid var(--action-accent); outline-offset: 2px; }
.vm-rules__body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; padding: 16px 18px; border-top: 1px solid var(--border-default); }
.vm-rules__body p { margin: 0; color: var(--text-secondary); }
.vm-rules__body strong { color: var(--text-primary); }
.vm-rules__body .vm-demo-disclaimer { grid-column: 1 / -1; padding: 10px 12px; color: var(--status-warning-foreground); background: var(--status-warning-background); border-radius: 8px; }
@media (max-width: 760px) { .vm-rules__body { grid-template-columns: 1fr; } .vm-rules__body .vm-demo-disclaimer { grid-column: auto; } }
</style>

