<script setup lang="ts">
/**
 * REFERENCE PAGE. Copy this pattern for every form:
 * zod schema → useForm → VeeField + shadcn Field → unwrap() → toast / inline errors.
 * Markup from the shadcn-vue `login-02` block.
 */
import { toTypedSchema } from '@vee-validate/zod'
import { Field as VeeField, useForm } from 'vee-validate'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { ApiError, fieldErrors, toUserMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Same limits as the backend's LoginBody, so most mistakes are caught before the request.
const schema = toTypedSchema(
  z.object({
    email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi').max(72, 'Maksimal 72 karakter'),
  }),
)

const { handleSubmit, isSubmitting, setErrors } = useForm({
  validationSchema: schema,
  initialValues: { email: '', password: '' },
})

const onSubmit = handleSubmit(async (values) => {
  try {
    await auth.login(values)
    toast.success(`Selamat datang, ${auth.user?.name}`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    // Only follow in-app paths so ?redirect= cannot send the user to another site.
    await router.push(redirect?.startsWith('/') ? redirect : { name: 'invitations' })
  } catch (err) {
    setErrors(fieldErrors(err))
    if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
      setErrors({ password: 'Email atau password salah' })
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
        <h1 class="text-2xl font-bold">Masuk ke akunmu</h1>
        <p class="text-sm text-balance text-muted-foreground">
          Kelola undangan, tamu, dan RSVP kamu.
        </p>
      </div>
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
            autocomplete="current-password"
            :aria-invalid="!!errors.length"
          />
          <FieldError :errors="errors" />
        </Field>
      </VeeField>
      <Field>
        <Button type="submit" :disabled="isSubmitting">
          <Spinner v-if="isSubmitting" />
          Masuk
        </Button>
        <FieldDescription class="text-center">
          Belum punya akun?
          <RouterLink to="/register">Daftar gratis</RouterLink>
        </FieldDescription>
      </Field>
    </FieldGroup>
  </form>
</template>
