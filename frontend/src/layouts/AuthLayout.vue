<script setup lang="ts">
// Two-column page from the shadcn-vue `login-02` / `signup-02` blocks.
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex justify-center gap-2 md:justify-start">
        <RouterLink to="/" class="text-lg font-semibold text-primary">undaang</RouterLink>
      </div>
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-xs">
          <RouterView />
        </div>
      </div>
    </div>
    <!-- Cover image goes here once the design is ready: put it in public/ and add an <img>
         with class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale". -->
    <div class="relative hidden bg-muted lg:block" />
  </div>
</template>
