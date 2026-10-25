import type { Component } from 'vue'

export type NavItem = { title: string; to: string; icon: Component }

/** The highlighted button above the menu (dashboard-01 "Quick Create"). */
export type NavAction = { title: string; to: string; icon: Component }

export type StatCard = {
  label: string
  /** Already formatted, e.g. formatNumber(1240) or formatRupiah(49000). */
  value: string
  badge?: { text: string; icon?: Component }
  footer?: string
  hint?: string
}
