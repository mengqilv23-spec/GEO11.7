import type { InputHTMLAttributes } from 'vue'

export interface InputProps {
  /** 受控输入值；原生输入后仅通过 update:modelValue 请求父级更新。 */
  modelValue?: string | number
  /** 原生输入类型，默认 text。 */
  type?: InputHTMLAttributes['type']
}

