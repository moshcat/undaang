import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PageMeta } from '@/api/types'

interface UsePaginatedQueryOptions<T> {
  fetch: (params: { page: number; limit: number }) => Promise<{ data: T[]; meta: PageMeta }>
  defaultLimit?: number
  watchQueryKeys?: string[]
}

export function usePaginatedQuery<T>(options: UsePaginatedQueryOptions<T>) {
  const route = useRoute()
  const router = useRouter()
  const defaultLimit = options.defaultLimit ?? 20
  const watchQueryKeys = options.watchQueryKeys ?? ['page', 'limit']

  const page = shallowRef(1)
  const limit = shallowRef(defaultLimit)
  const loading = shallowRef(false)
  const error = shallowRef<unknown>(null)
  const data = shallowRef<T[]>([])
  const meta = shallowRef<PageMeta | null>(null)

  const totalPages = computed(() => meta.value?.total_pages ?? 1)
  const total = computed(() => meta.value?.total ?? 0)

  function positiveInt(value: unknown) {
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }

  function syncFromRoute() {
    page.value = positiveInt(route.query.page) ?? 1
    limit.value = positiveInt(route.query.limit) ?? defaultLimit
  }

  async function reload() {
    loading.value = true
    error.value = null
    try {
      const result = await options.fetch({ page: page.value, limit: limit.value })
      data.value = result.data
      meta.value = result.meta
    } catch (cause) {
      error.value = cause
      data.value = []
      meta.value = null
    } finally {
      loading.value = false
    }
  }

  async function goToPage(nextPage: number) {
    if (nextPage === page.value) return

    const query = Object.fromEntries(Object.entries(route.query).filter(([key]) => key !== 'page'))
    if (nextPage > 1) query.page = String(nextPage)
    await router.replace({ query })
  }

  watch(
    () => watchQueryKeys.map((key) => route.query[key]).join('|'),
    () => {
      syncFromRoute()
      void reload()
    },
    { immediate: true },
  )

  return {
    page,
    limit,
    loading,
    error,
    data,
    meta,
    totalPages,
    total,
    reload,
    goToPage,
  }
}
