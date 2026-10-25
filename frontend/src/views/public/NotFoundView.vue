<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
</script>

<template>
  <div class="flex min-h-svh items-center justify-center p-4">
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Halaman tidak ditemukan</EmptyTitle>
        <EmptyDescription>Alamat yang kamu buka tidak ada atau sudah dipindahkan.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child><RouterLink to="/">Kembali ke beranda</RouterLink></Button>
      </EmptyContent>
    </Empty>
  </div>
</template>
