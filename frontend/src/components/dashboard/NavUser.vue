<script setup lang="ts">
import {
  EllipsisVerticalIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ReceiptIcon,
  ShieldIcon,
  UserCircleIcon,
} from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth'

defineProps<{ area: 'app' | 'admin' }>()

const auth = useAuthStore()
const router = useRouter()
const { isMobile } = useSidebar()

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
)

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="size-8 rounded-lg">
              <AvatarFallback class="rounded-lg">{{ initials }}</AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{{ auth.user?.name }}</span>
              <span class="truncate text-xs text-muted-foreground">{{ auth.user?.email }}</span>
            </div>
            <EllipsisVerticalIcon class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="4"
          align="end"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="size-8 rounded-lg">
                <AvatarFallback class="rounded-lg">{{ initials }}</AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-medium">{{ auth.user?.name }}</span>
                <span class="truncate text-xs text-muted-foreground">{{ auth.user?.email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem as-child>
              <RouterLink to="/app/profile"><UserCircleIcon />Profil</RouterLink>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <RouterLink to="/app/orders"><ReceiptIcon />Riwayat Transaksi</RouterLink>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="auth.isAdmin && area === 'app'" as-child>
              <RouterLink to="/admin"><ShieldIcon />Panel Admin</RouterLink>
            </DropdownMenuItem>
            <DropdownMenuItem v-if="area === 'admin'" as-child>
              <RouterLink to="/app"><LayoutDashboardIcon />Dashboard Pengguna</RouterLink>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="logout"><LogOutIcon />Keluar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
