import { createPinia } from 'pinia'
import { createApp } from 'vue'
import '@fontsource-variable/inter'
import 'vue-sonner/style.css'
import './style.css'
import { onUnauthorized } from './api/client'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Token expired or revoked mid-session: drop it and send the user to login.
onUnauthorized(() => {
  useAuthStore().logout()
  const current = router.currentRoute.value
  if (current.meta.requiresAuth) {
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
})

app.mount('#app')
