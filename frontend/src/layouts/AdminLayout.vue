<script setup lang="ts">
import { ChartColumnIcon, MailIcon, PaletteIcon, ReceiptIcon } from '@lucide/vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import type { NavItem } from '@/components/dashboard/types'

const nav: NavItem[] = [
  { title: 'Statistik', to: '/admin/stats', icon: ChartColumnIcon },
  { title: 'Tema', to: '/admin/themes', icon: PaletteIcon },
  { title: 'Transaksi', to: '/admin/orders', icon: ReceiptIcon },
  { title: 'Undangan', to: '/admin/invitations', icon: MailIcon },
]
</script>

<template>
  <DashboardShell :nav="nav" area="admin" />
</template>
