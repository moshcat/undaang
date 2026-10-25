<script setup lang="ts">
// Page shell from the shadcn-vue `dashboard-01` block: inset sidebar + sticky header.
import type { NavAction, NavItem } from './types'
import { RouterView } from 'vue-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from './AppSidebar.vue'
import SiteHeader from './SiteHeader.vue'

defineProps<{ nav: NavItem[]; action?: NavAction; area: 'app' | 'admin' }>()
</script>

<template>
  <SidebarProvider
    :style="{
      '--sidebar-width': 'calc(var(--spacing) * 72)',
      '--header-height': 'calc(var(--spacing) * 12)',
    }"
  >
    <AppSidebar variant="inset" :nav="nav" :action="action" :area="area" />
    <SidebarInset>
      <SiteHeader />
      <div class="@container/main flex flex-1 flex-col">
        <main class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
          <RouterView />
        </main>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
