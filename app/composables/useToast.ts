// useToast — design-spec/00 §3.8
// Canto inferior-direito, 4s, máx 3; erro persiste; ação opcional ("Desfazer")
export interface ToastItem {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  actionLabel?: string
  onAction?: () => void
}

const toasts = ref<ToastItem[]>([])
let nextId = 1

export function useToast() {
  function push(t: Omit<ToastItem, 'id'>) {
    const item: ToastItem = { id: nextId++, ...t }
    toasts.value.push(item)
    if (toasts.value.length > 3) toasts.value.shift()
    if (t.type !== 'error') setTimeout(() => dismiss(item.id), 4000)
    return item.id
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }
  return {
    toasts: readonly(toasts),
    dismiss,
    success: (message: string, opts?: Partial<ToastItem>) => push({ type: 'success', message, ...opts }),
    error: (message: string, opts?: Partial<ToastItem>) => push({ type: 'error', message, ...opts }),
    info: (message: string, opts?: Partial<ToastItem>) => push({ type: 'info', message, ...opts }),
    warning: (message: string, opts?: Partial<ToastItem>) => push({ type: 'warning', message, ...opts }),
  }
}
