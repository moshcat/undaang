<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/format'
import PageHeader from '@/components/PageHeader.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LogOutIcon } from '@lucide/vue'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) {
    await auth.restore()
  }
})

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <PageHeader title="Profil" description="Data akun yang sedang login." />

  <div class="mt-6">
    <Card class="max-w-xl">
      <CardHeader class="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Informasi Akun</CardTitle>
        <Badge v-if="auth.user?.role === 'admin'">Admin</Badge>
        <Badge v-else variant="secondary">Pengguna</Badge>
      </CardHeader>
      <CardContent class="grid gap-4">
        <div class="grid gap-1">
          <p class="text-sm text-muted-foreground">Nama</p>
          <p class="text-sm font-medium">{{ auth.user?.name || '-' }}</p>
        </div>
        <div class="grid gap-1">
          <p class="text-sm text-muted-foreground">Email</p>
          <p class="text-sm">{{ auth.user?.email || '-' }}</p>
        </div>
        <div class="grid gap-1">
          <p class="text-sm text-muted-foreground">Bergabung sejak</p>
          <p class="text-sm">{{ formatDate(auth.user?.createdAt) }}</p>
        </div>
        <div class="pt-2">
          <Button variant="outline" class="gap-2" @click="logout">
            <LogOutIcon class="size-4" />
            Keluar
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>