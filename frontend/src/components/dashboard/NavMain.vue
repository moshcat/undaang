<script setup lang="ts">
import type { NavAction, NavItem } from './types'
import { RouterLink, useRoute } from 'vue-router'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

defineProps<{ items: NavItem[]; action?: NavAction }>()

const route = useRoute()

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent class="flex flex-col gap-2">
      <SidebarMenu v-if="action">
        <SidebarMenuItem>
          <SidebarMenuButton
            as-child
            :tooltip="action.title"
            class="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
          >
            <RouterLink :to="action.to">
              <component :is="action.icon" />
              <span>{{ action.title }}</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarMenu>
        <SidebarMenuItem v-for="item in items" :key="item.to">
          <SidebarMenuButton as-child :tooltip="item.title" :is-active="isActive(item.to)">
            <RouterLink :to="item.to">
              <component :is="item.icon" />
              <span>{{ item.title }}</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
