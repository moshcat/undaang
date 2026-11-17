<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CalendarXIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TriangleAlertIcon,
} from '@lucide/vue'
import { api, unwrap } from '@/api/client'
import { toUserMessage } from '@/api/errors'
import type { Invitation, InvitationStatus } from '@/api/types'
import PageHeader from '@/components/PageHeader.vue'
import CreateInvitationDialog from '@/components/invitations/CreateInvitationDialog.vue'
import InvitationCard from '@/components/invitations/InvitationCard.vue'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePaginatedQuery } from '@/composables/usePaginatedQuery'
import { INVITATION_STATUS_LABELS } from '@/lib/labels'

const route = useRoute()
const router = useRouter()

const STATUS_VALUES: InvitationStatus[] = ['draft', 'published', 'suspended']
const STATUS_FILTERS: { value: 'all' | InvitationStatus; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: INVITATION_STATUS_LABELS.draft.label },
  { value: 'published', label: INVITATION_STATUS_LABELS.published.label },
  { value: 'suspended', label: INVITATION_STATUS_LABELS.suspended.label },
]

const status = computed<InvitationStatus | undefined>(() => {
  const value = route.query.status
  if (typeof value !== 'string') return undefined
  return STATUS_VALUES.includes(value as InvitationStatus) ? (value as InvitationStatus) : undefined
})

const activeStatus = computed(() => status.value ?? 'all')

const { page, limit, loading, error, data, totalPages, total, reload, goToPage } =
  usePaginatedQuery<Invitation>({
    fetch: ({ page, limit }) =>
      unwrap(
        api.GET('/api/v1/invitations', {
          params: {
            query: {
              page,
              limit,
              ...(status.value ? { status: status.value } : {}),
            },
          },
        }),
      ),
    defaultLimit: 9,
    watchQueryKeys: ['page', 'limit', 'status'],
  })

const pageNumbers = computed<(number | 'ellipsis')[]>(() => {
  const lastPage = totalPages.value
  const current = page.value

  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]
  if (current > 3) pages.push('ellipsis')

  for (
    let value = Math.max(2, current - 1);
    value <= Math.min(lastPage - 1, current + 1);
    value++
  ) {
    pages.push(value)
  }

  if (current < lastPage - 2) pages.push('ellipsis')
  pages.push(lastPage)
  return pages
})

const createOpen = shallowRef(false)

watch(
  () => route.query.new,
  (value) => {
    if (value === '1') createOpen.value = true
  },
  { immediate: true },
)

async function setStatus(next: string) {
  if (next === activeStatus.value) return

  const query = Object.fromEntries(
    Object.entries(route.query).filter(([key]) => key !== 'page' && key !== 'status'),
  )
  if (next !== 'all') query.status = next
  await router.replace({ query })
}

async function onDialogOpenChange(value: boolean) {
  createOpen.value = value
  if (!value && route.query.new === '1') {
    const query = Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'new'))
    await router.replace({ query })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Undangan Saya" description="Semua undangan yang kamu buat.">
      <template #actions>
        <Button @click="createOpen = true">
          <PlusIcon data-icon="inline-start" />
          Undangan Baru
        </Button>
      </template>
    </PageHeader>

    <Tabs :model-value="activeStatus" @update:model-value="(value) => setStatus(String(value))">
      <TabsList class="w-full sm:w-fit">
        <TabsTrigger v-for="filter in STATUS_FILTERS" :key="filter.value" :value="filter.value">
          {{ filter.label }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div v-if="loading" class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      <Card v-for="index in 6" :key="index">
        <CardHeader>
          <Skeleton class="h-5 w-2/3" />
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Skeleton class="h-9 w-full" />
          <Skeleton class="h-4 w-1/2" />
        </CardContent>
        <CardFooter>
          <Skeleton class="h-9 w-full" />
        </CardFooter>
      </Card>
    </div>

    <Alert v-else-if="error" variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>Gagal memuat undangan</AlertTitle>
      <AlertDescription>{{ toUserMessage(error) }}</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" @click="reload">Coba lagi</Button>
      </AlertAction>
    </Alert>

    <Empty v-else-if="data.length === 0" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarXIcon />
        </EmptyMedia>
        <EmptyTitle>Belum ada undangan</EmptyTitle>
        <EmptyDescription>
          {{
            status
              ? 'Tidak ada undangan dengan status ini.'
              : 'Mulai buat undangan pertamamu dan bagikan momen spesialmu.'
          }}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button @click="createOpen = true">
          <PlusIcon data-icon="inline-start" />
          Buat Undangan
        </Button>
      </EmptyContent>
    </Empty>

    <div v-else class="flex flex-col gap-6">
      <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <InvitationCard
          v-for="invitation in data"
          :key="invitation.id"
          :invitation="invitation"
          @deleted="reload"
        />
      </div>

      <Pagination
        v-if="totalPages > 1"
        v-slot="{ page: currentPage }"
        :page="page"
        :items-per-page="limit"
        :total="total"
        @update:page="goToPage"
      >
        <PaginationContent class="flex-wrap">
          <PaginationPrevious>
            <ChevronLeftIcon data-icon="inline-start" />
            <span class="hidden sm:block">Sebelumnya</span>
          </PaginationPrevious>

          <template v-for="(item, index) in pageNumbers" :key="`${item}-${index}`">
            <PaginationEllipsis v-if="item === 'ellipsis'">
              <MoreHorizontalIcon />
              <span class="sr-only">Halaman lainnya</span>
            </PaginationEllipsis>
            <PaginationItem v-else :value="item" :is-active="item === currentPage">
              {{ item }}
            </PaginationItem>
          </template>

          <PaginationNext>
            <span class="hidden sm:block">Berikutnya</span>
            <ChevronRightIcon data-icon="inline-end" />
          </PaginationNext>
        </PaginationContent>
      </Pagination>
    </div>

    <CreateInvitationDialog :open="createOpen" @update:open="onDialogOpenChange" />
  </div>
</template>
