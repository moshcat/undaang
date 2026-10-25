<script setup lang="ts">
// TODO(T-02): see docs/TASKS.md
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import TodoPlaceholder from '@/components/TodoPlaceholder.vue'
</script>

<template>
  <div class="mx-auto flex min-h-svh max-w-5xl flex-col gap-10 p-4 md:p-10">
    <header class="flex items-center justify-between">
      <span class="text-xl font-semibold text-primary">undaang</span>
      <nav class="flex gap-2">
        <Button variant="ghost" as-child><RouterLink to="/login">Masuk</RouterLink></Button>
        <Button as-child><RouterLink to="/register">Daftar Gratis</RouterLink></Button>
      </nav>
    </header>
    <TodoPlaceholder task="T-02" />
  </div>
</template>
