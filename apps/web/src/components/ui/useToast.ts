import * as React from 'react'
import type { ToastProps } from './Toast'

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
}

let count = 0
const genId = () => (++count).toString()

type State = { toasts: ToasterToast[] }
let memoryState: State = { toasts: [] }
const listeners: Array<(state: State) => void> = []

function dispatch(toasts: ToasterToast[]) {
  memoryState = { toasts }
  listeners.forEach((l) => l(memoryState))
}

function toast(props: Omit<ToasterToast, 'id'>) {
  const id = genId()
  const newToast = { id, ...props }
  dispatch([...memoryState.toasts.slice(-(TOAST_LIMIT - 1)), newToast])
  setTimeout(() => {
    dispatch(memoryState.toasts.filter((t) => t.id !== id))
  }, TOAST_REMOVE_DELAY)
  return id
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const i = listeners.indexOf(setState)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [])
  return { toasts: state.toasts, toast }
}

export { useToast, toast }
