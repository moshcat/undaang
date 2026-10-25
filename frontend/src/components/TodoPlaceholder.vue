<script setup lang="ts">
import { HammerIcon } from '@lucide/vue'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

// Placeholder for a page that is not built yet. Delete it when you implement the task.
defineProps<{ task: string }>()
</script>

<template>
  <Empty class="border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><HammerIcon /></EmptyMedia>
      <EmptyTitle>Halaman belum dibuat</EmptyTitle>
      <EmptyDescription
        >Dikerjakan di tiket {{ task }}. Lihat frontend/docs/TASKS.md.</EmptyDescription
      >
    </EmptyHeader>
  </Empty>
</template>
