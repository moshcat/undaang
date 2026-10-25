<script setup lang="ts">
import { MailIcon, PlusCircleIcon, ReceiptIcon, UserIcon } from '@lucide/vue'
import DashboardShell from '@/components/dashboard/DashboardShell.vue'
import type { NavAction, NavItem } from '@/components/dashboard/types'

const nav: NavItem[] = [
  { title: 'Undangan Saya', to: '/app/invitations', icon: MailIcon },
  { title: 'Riwayat Transaksi', to: '/app/orders', icon: ReceiptIcon },
  { title: 'Profil', to: '/app/profile', icon: UserIcon },
]

// InvitationsView opens the "Buat Undangan Baru" dialog when ?new=1 is present (T-04).
const action: NavAction = {
  title: 'Undangan Baru',
  to: '/app/invitations?new=1',
  icon: PlusCircleIcon,
}
</script>

<template>
  <DashboardShell :nav="nav" :action="action" area="app" />
</template>
