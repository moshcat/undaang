<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
  BarChart3Icon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  CrownIcon,
  ExternalLinkIcon,
  EyeIcon,
  MessageSquareIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UsersIcon,
} from '@lucide/vue'
import { api, unwrap } from '@/api/client'
import { toUserMessage } from '@/api/errors'
import type { Invitation } from '@/api/types'
import { formatDate, formatNumber } from '@/lib/format'
import { INVITATION_STATUS_LABELS, PLAN_LABELS } from '@/lib/labels'
import { toast } from 'vue-sonner'

const props = defineProps<{ invitation: Invitation }>()
const emit = defineEmits<{ deleted: [] }>()

const { copy, copied, isSupported } = useClipboard()
const deleteOpen = shallowRef(false)
const deleting = shallowRef(false)

const publicUrl = computed(() => `${window.location.origin}/u/${props.invitation.slug}`)
const status = computed(() => INVITATION_STATUS_LABELS[props.invitation.status])
const plan = computed(() => PLAN_LABELS[props.invitation.plan])
const title = computed(() => {
  const names = [
    props.invitation.couple.groom.name.trim(),
    props.invitation.couple.bride.name.trim(),
  ].filter(Boolean)
  return names.join(' & ') || props.invitation.slug
})

async function copyLink() {
  if (!isSupported.value) {
    toast.error('Browser ini tidak mendukung penyalinan tautan')
    return
  }
  await copy(publicUrl.value)
  toast.success('Tautan publik disalin')
}

async function removeInvitation() {
  deleting.value = true
  try {
    await unwrap(
      api.DELETE('/api/v1/invitations/{id}', {
        params: { path: { id: props.invitation.id } },
      }),
    )
    deleteOpen.value = false
    toast.success('Undangan dihapus')
    emit('deleted')
  } catch (err) {
    toast.error(toUserMessage(err))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <CardTitle class="min-w-0 truncate">{{ title }}</CardTitle>
        <div class="flex flex-wrap gap-1.5">
          <Badge :variant="status.variant">{{ status.label }}</Badge>
          <Badge :variant="plan.variant">{{ plan.label }}</Badge>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex flex-col gap-4">
      <InputGroup>
        <InputGroupInput :model-value="publicUrl" readonly aria-label="Tautan publik undangan" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            :aria-label="copied ? 'Tautan tersalin' : 'Salin tautan publik'"
            @click="copyLink"
          >
            <CheckIcon v-if="copied" />
            <CopyIcon v-else />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span class="flex items-center gap-1.5">
          <EyeIcon class="size-4" />
          {{ formatNumber(invitation.view_count) }} dilihat
        </span>
        <span class="flex items-center gap-1.5">
          <CalendarIcon class="size-4" />
          Aktif hingga {{ formatDate(invitation.plan_expires_at) }}
        </span>
      </div>
    </CardContent>

    <CardFooter class="gap-2">
      <Button variant="outline" class="flex-1" as-child>
        <RouterLink :to="{ name: 'invitation-edit', params: { id: invitation.id } }">
          <PencilIcon data-icon="inline-start" />
          Edit
        </RouterLink>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" aria-label="Aksi undangan">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem as-child>
            <RouterLink :to="{ name: 'invitation-guests', params: { id: invitation.id } }">
              <UsersIcon />
              Tamu
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink :to="{ name: 'invitation-rsvps', params: { id: invitation.id } }">
              <MessageSquareIcon />
              RSVP
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink :to="{ name: 'invitation-stats', params: { id: invitation.id } }">
              <BarChart3Icon />
              Statistik
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink :to="{ name: 'invitation-upgrade', params: { id: invitation.id } }">
              <CrownIcon />
              Upgrade paket
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem v-if="invitation.status === 'published'" as-child>
            <a :href="publicUrl" target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon />
              Lihat undangan
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" @select="deleteOpen = true">
            <Trash2Icon />
            Hapus undangan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardFooter>
  </Card>

  <AlertDialog v-model:open="deleteOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogMedia class="bg-destructive/10 text-destructive">
          <TriangleAlertIcon />
        </AlertDialogMedia>
        <AlertDialogTitle>Hapus undangan ini?</AlertDialogTitle>
        <AlertDialogDescription>
          Undangan "{{ invitation.slug }}" beserta tamu dan RSVP-nya akan dihapus permanen.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="deleting">Batal</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          :disabled="deleting"
          @click.prevent="removeInvitation"
        >
          <Spinner v-if="deleting" />
          Hapus
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
