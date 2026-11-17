<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { CrownIcon, LockIcon, PaletteIcon, TriangleAlertIcon } from '@lucide/vue'
import { api, unwrap } from '@/api/client'
import { ApiError, fieldErrors, toUserMessage } from '@/api/errors'
import type { CreateInvitationBody, Theme } from '@/api/types'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { PLAN_LABELS } from '@/lib/labels'

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const themes = shallowRef<Theme[]>([])
const themesLoading = shallowRef(false)
const themesError = shallowRef<unknown>(null)

const schema = toTypedSchema(
  z.object({
    slug: z
      .string()
      .trim()
      .min(3, 'Minimal 3 karakter')
      .max(60, 'Maksimal 60 karakter')
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Gunakan huruf kecil, angka, dan tanda hubung'),
    theme_id: z.string().min(1, 'Pilih tema undangan'),
    groom_name: z.string().trim().max(100, 'Maksimal 100 karakter'),
    bride_name: z.string().trim().max(100, 'Maksimal 100 karakter'),
  }),
)

const { handleSubmit, isSubmitting, setErrors, setFieldValue, values, resetForm } = useForm({
  validationSchema: schema,
  initialValues: {
    slug: '',
    theme_id: '',
    groom_name: '',
    bride_name: '',
  },
})

const submitDisabled = computed(
  () => isSubmitting.value || themesLoading.value || themes.value.length === 0,
)

function normalizeSlug(value: string | number) {
  return String(value).toLowerCase().replace(/\s+/g, '-')
}

function selectTheme(value: unknown) {
  setFieldValue('theme_id', String(value))
}

async function loadThemes() {
  themesLoading.value = true
  themesError.value = null
  try {
    const { data } = await unwrap(api.GET('/api/v1/themes'))
    themes.value = data.filter((theme) => theme.is_active)
    if (!themes.value.some((theme) => theme.id === values.theme_id)) {
      const freeTheme = themes.value.find((theme) => theme.tier === 'free')
      setFieldValue('theme_id', freeTheme?.id ?? '')
    }
  } catch (err) {
    themesError.value = err
    themes.value = []
  } finally {
    themesLoading.value = false
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      void loadThemes()
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (form) => {
  try {
    const groom = form.groom_name.trim()
    const bride = form.bride_name.trim()
    const body: CreateInvitationBody = {
      slug: form.slug,
      theme_id: form.theme_id,
    }

    if (groom || bride) {
      body.couple = {}
      if (groom) {
        body.couple.groom = { name: groom, nickname: '', parents: '', photo_url: null }
      }
      if (bride) {
        body.couple.bride = { name: bride, nickname: '', parents: '', photo_url: null }
      }
    }

    const { data } = await unwrap(api.POST('/api/v1/invitations', { body }))
    toast.success('Undangan berhasil dibuat')
    open.value = false
    await router.push({ name: 'invitation-edit', params: { id: data.id } })
  } catch (err) {
    setErrors(fieldErrors(err))
    if (err instanceof ApiError && err.code === 'CONFLICT') {
      setErrors({ slug: 'Alamat ini sudah dipakai' })
      toast.error('Alamat undangan sudah dipakai')
      return
    }
    toast.error(toUserMessage(err))
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[calc(100svh-2rem)] overflow-y-auto">
      <form class="flex flex-col gap-6" novalidate @submit="onSubmit">
        <DialogHeader>
          <DialogTitle>Buat undangan baru</DialogTitle>
          <DialogDescription>
            Pilih alamat dan tema. Data mempelai bisa dilengkapi nanti di editor.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup class="gap-5">
          <VeeField v-slot="{ field, errors }" name="slug">
            <Field :data-invalid="!!errors.length">
              <FieldLabel for="slug">Alamat undangan</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>undaang.id/u/</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="slug"
                  :model-value="field.value"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="raka-dan-sinta"
                  :aria-invalid="!!errors.length"
                  @update:model-value="
                    (value: string | number) => field.onChange(normalizeSlug(value))
                  "
                  @blur="field.onBlur"
                />
              </InputGroup>
              <FieldError :errors="errors" />
            </Field>
          </VeeField>

          <VeeField v-slot="{ errors }" name="theme_id">
            <Field :data-invalid="!!errors.length">
              <FieldLabel>Tema</FieldLabel>

              <div v-if="themesLoading" class="grid gap-3 sm:grid-cols-2">
                <Skeleton v-for="index in 4" :key="index" class="h-24 rounded-3xl" />
              </div>

              <Alert v-else-if="themesError" variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>Gagal memuat tema</AlertTitle>
                <AlertDescription>{{ toUserMessage(themesError) }}</AlertDescription>
                <AlertAction>
                  <Button type="button" variant="outline" size="sm" @click="loadThemes">
                    Coba lagi
                  </Button>
                </AlertAction>
              </Alert>

              <Alert v-else-if="themes.length === 0">
                <PaletteIcon />
                <AlertTitle>Belum ada tema tersedia</AlertTitle>
                <AlertDescription>Coba lagi beberapa saat lagi.</AlertDescription>
              </Alert>

              <RadioGroup
                v-else
                :model-value="values.theme_id"
                class="grid gap-3 sm:grid-cols-2"
                @update:model-value="selectTheme"
              >
                <FieldLabel
                  v-for="theme in themes"
                  :key="theme.id"
                  :for="`theme-${theme.id}`"
                  :class="[
                    'flex w-full cursor-pointer items-start gap-3 rounded-3xl border p-4',
                    theme.tier !== 'free' ? 'cursor-not-allowed opacity-60' : '',
                    values.theme_id === theme.id ? 'border-primary' : 'border-border',
                  ]"
                >
                  <RadioGroupItem
                    :id="`theme-${theme.id}`"
                    :value="theme.id"
                    :disabled="theme.tier !== 'free'"
                    class="mt-0.5"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-medium">{{ theme.name }}</span>
                      <Badge :variant="PLAN_LABELS[theme.tier].variant">
                        <CrownIcon v-if="theme.tier !== 'free'" />
                        {{ PLAN_LABELS[theme.tier].label }}
                      </Badge>
                    </div>
                    <p
                      v-if="theme.tier !== 'free'"
                      class="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                    >
                      <LockIcon class="size-3" />
                      Tersedia di paket {{ PLAN_LABELS[theme.tier].label }}
                    </p>
                    <p v-else class="mt-1 text-xs text-muted-foreground">
                      Tersedia di paket Gratis
                    </p>
                  </div>
                </FieldLabel>
              </RadioGroup>

              <FieldError :errors="errors" />
            </Field>
          </VeeField>

          <div class="grid gap-4 sm:grid-cols-2">
            <VeeField v-slot="{ field, errors }" name="groom_name">
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="groom_name">Nama mempelai pria</FieldLabel>
                <Input
                  id="groom_name"
                  v-bind="field"
                  autocomplete="off"
                  placeholder="Nama lengkap"
                  :aria-invalid="!!errors.length"
                />
                <FieldError :errors="errors" />
              </Field>
            </VeeField>

            <VeeField v-slot="{ field, errors }" name="bride_name">
              <Field :data-invalid="!!errors.length">
                <FieldLabel for="bride_name">Nama mempelai wanita</FieldLabel>
                <Input
                  id="bride_name"
                  v-bind="field"
                  autocomplete="off"
                  placeholder="Nama lengkap"
                  :aria-invalid="!!errors.length"
                />
                <FieldError :errors="errors" />
              </Field>
            </VeeField>
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">Batal</Button>
          <Button type="submit" :disabled="submitDisabled">
            <Spinner v-if="isSubmitting" />
            Buat undangan
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
