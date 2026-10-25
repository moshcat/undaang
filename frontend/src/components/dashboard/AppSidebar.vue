<script setup lang="ts">
// Adapted from the shadcn-vue `dashboard-01` block.
import type { SidebarProps } from '@/components/ui/sidebar'
import type { NavAction, NavItem } from './types'
import { RouterLink } from 'vue-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import NavMain from './NavMain.vue'
import NavUser from './NavUser.vue'

const props = defineProps<
  SidebarProps & { nav: NavItem[]; action?: NavAction; area: 'app' | 'admin' }
>()
</script>

<template>
  <Sidebar collapsible="offcanvas" :variant="props.variant">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child class="data-[slot=sidebar-menu-button]:p-1.5!">
            <RouterLink :to="props.area === 'admin' ? '/admin' : '/app'">
              <span class="text-base font-semibold text-primary">undaang</span>
              <span v-if="props.area === 'admin'" class="text-xs text-muted-foreground">admin</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <NavMain :items="props.nav" :action="props.action" />
    </SidebarContent>
    <SidebarFooter>
      <NavUser :area="props.area" />
    </SidebarFooter>
  </Sidebar>
</template>
