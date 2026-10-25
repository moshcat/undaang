<script setup lang="ts">
// Same pattern as LoginView.vue; markup from the shadcn-vue `signup-02` block.
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, useForm } from 'vee-validate'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { ApiError, fieldErrors, toUserMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

// Mirrors the backend's RegisterBody: name 1–100, valid email, password 8–72.
// confirm_password is checked here only and never sent.
const schema = toTypedSchema(
  z
    .object({
      name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Maksimal 100 karakter'),
      email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
      password: z.string().min(8, 'Minimal 8 karakter').max(72, 'Maksimal 72 karakter'),
      confirm_password: z.string().min(1, 'Ulangi password'),
    })
    .refine((v) => v.password === v.confirm_password, {
      message: 'Password tidak sama',
      path: ['confirm_password'],
    }),
)

const { handleSubmit, isSubmitting, setErrors } = useForm({
  validationSchema: schema,
  initialValues: { name: '', email: '', password: '', confirm_password: '' },
})

const onSubmit = handleSubmit(async ({ name, email, password }) => {
  try {
    await auth.register({ name, email, password })
    toast.success('Akun berhasil dibuat')
    await router.push({ name: 'invitations' })
  } catch (err) {
    setErrors(fieldErrors(err))
    if (err instanceof ApiError && err.code === 'CONFLICT') {
      setErrors({ email: 'Email ini sudah terdaftar' })
    } else {
      toast.error(toUserMessage(err))
    }
  }
})
</script>

<template>
  <form class="flex flex-col gap-6" novalidate @submit="onSubmit">
    <FieldGroup>
      <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-2xl font-bold">Buat akun</h1>
        <p class="text-sm text-balance text-muted-foreground">
          Gratis. Undangan pertamamu siap dalam 15 menit.
        </p>
      </div>
      <VeeField v-slot="{ field, errors }" name="name">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="name">Nama lengkap</FieldLabel>
          <Input id="name" v-bind="field" autocomplete="name" :aria-invalid="!!errors.length" />
          <FieldError :errors="errors" />
        </Field>
      </VeeField>
      <VeeField v-slot="{ field, errors }" name="email">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="email">Email</FieldLabel>
          <Input
            id="email"
            v-bind="field"
            type="email"
            autocomplete="email"
            placeholder="nama@email.com"
            :aria-invalid="!!errors.length"
          />
          <FieldError :errors="errors" />
        </Field>
      </VeeField>
      <VeeField v-slot="{ field, errors }" name="password">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="password">Password</FieldLabel>
          <Input
            id="password"
            v-bind="field"
            type="password"
            autocomplete="new-password"
            :aria-invalid="!!errors.length"
          />
          <FieldDescription>Minimal 8 karakter.</FieldDescription>
          <FieldError :errors="errors" />
        </Field>
      </VeeField>
      <VeeField v-slot="{ field, errors }" name="confirm_password">
        <Field :data-invalid="!!errors.length">
          <FieldLabel for="confirm-password">Ulangi password</FieldLabel>
          <Input
            id="confirm-password"
            v-bind="field"
            type="password"
            autocomplete="new-password"
            :aria-invalid="!!errors.length"
          />
          <FieldError :errors="errors" />
        </Field>
      </VeeField>
      <Field>
        <Button type="submit" :disabled="isSubmitting">
          <Spinner v-if="isSubmitting" />
          Daftar
        </Button>
        <FieldDescription class="px-6 text-center">
          Sudah punya akun? <RouterLink to="/login">Masuk</RouterLink>
        </FieldDescription>
      </Field>
    </FieldGroup>
  </form>
</template>
