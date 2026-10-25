<script setup lang="ts">
// The `SectionCards` grid from the shadcn-vue `dashboard-01` block, fed by props instead of demo data.
import type { StatCard } from './types'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

defineProps<{ items: StatCard[] }>()
</script>

<template>
  <div
    class="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
  >
    <Card v-for="item in items" :key="item.label" class="@container/card">
      <CardHeader>
        <CardDescription>{{ item.label }}</CardDescription>
        <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {{ item.value }}
        </CardTitle>
        <CardAction v-if="item.badge">
          <Badge variant="outline">
            <component :is="item.badge.icon" v-if="item.badge.icon" />
            {{ item.badge.text }}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter v-if="item.footer || item.hint" class="flex-col items-start gap-1.5 text-sm">
        <div v-if="item.footer" class="line-clamp-1 font-medium">{{ item.footer }}</div>
        <div v-if="item.hint" class="text-muted-foreground">{{ item.hint }}</div>
      </CardFooter>
    </Card>
  </div>
</template>
