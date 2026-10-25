import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Shown in the dashboard header and the browser tab. */
    title?: string
    /** Needs a logged-in user. Inherited by child routes. */
    requiresAuth?: boolean
    /** Only for this role. */
    role?: 'admin'
    /** Login/register: logged-in users are sent to the dashboard. */
    guestOnly?: boolean
  }
}

// `/u/:slug` and `/orders/:invoice` are part of the backend contract: guest links and the
// DOKU return URL point at them. Do not rename them.
export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/public/LandingView.vue'),
      meta: { title: 'Undangan pernikahan digital' },
    },
    {
      path: '/u/:slug',
      name: 'public-invitation',
      component: () => import('@/views/public/InvitationView.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AuthLayout.vue'),
      meta: { guestOnly: true },
      children: [
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/LoginView.vue'),
          meta: { title: 'Masuk' },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/views/auth/RegisterView.vue'),
          meta: { title: 'Daftar' },
        },
      ],
    },
    {
      path: '/app',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: { name: 'invitations' } },
        {
          path: 'invitations',
          name: 'invitations',
          component: () => import('@/views/app/InvitationsView.vue'),
          meta: { title: 'Undangan Saya' },
        },
        {
          path: 'invitations/:id/edit',
          name: 'invitation-edit',
          component: () => import('@/views/app/InvitationEditorView.vue'),
          meta: { title: 'Edit Undangan' },
        },
        {
          path: 'invitations/:id/guests',
          name: 'invitation-guests',
          component: () => import('@/views/app/GuestsView.vue'),
          meta: { title: 'Daftar Tamu' },
        },
        {
          path: 'invitations/:id/rsvps',
          name: 'invitation-rsvps',
          component: () => import('@/views/app/RsvpsView.vue'),
          meta: { title: 'RSVP & Ucapan' },
        },
        {
          path: 'invitations/:id/stats',
          name: 'invitation-stats',
          component: () => import('@/views/app/StatsView.vue'),
          meta: { title: 'Statistik' },
        },
        {
          path: 'invitations/:id/upgrade',
          name: 'invitation-upgrade',
          component: () => import('@/views/app/UpgradeView.vue'),
          meta: { title: 'Upgrade Paket' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/app/OrdersView.vue'),
          meta: { title: 'Riwayat Transaksi' },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/app/ProfileView.vue'),
          meta: { title: 'Profil' },
        },
      ],
    },
    {
      path: '/orders/:invoice',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'order-status',
          component: () => import('@/views/app/OrderStatusView.vue'),
          meta: { title: 'Status Pembayaran' },
        },
      ],
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        { path: '', redirect: { name: 'admin-stats' } },
        {
          path: 'stats',
          name: 'admin-stats',
          component: () => import('@/views/admin/AdminStatsView.vue'),
          meta: { title: 'Statistik Sistem' },
        },
        {
          path: 'themes',
          name: 'admin-themes',
          component: () => import('@/views/admin/AdminThemesView.vue'),
          meta: { title: 'Katalog Tema' },
        },
        {
          path: 'orders',
          name: 'admin-orders',
          component: () => import('@/views/admin/AdminOrdersView.vue'),
          meta: { title: 'Semua Transaksi' },
        },
        {
          path: 'invitations',
          name: 'admin-invitations',
          component: () => import('@/views/admin/AdminInvitationsView.vue'),
          meta: { title: 'Semua Undangan' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/public/NotFoundView.vue'),
      meta: { title: 'Halaman tidak ditemukan' },
    },
  ],
})

let restored = false

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!restored) {
    await auth.restore()
    restored = true
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.role === 'admin' && !auth.isAdmin) return { name: 'invitations' }
  if (to.meta.guestOnly && auth.isLoggedIn) return { name: 'invitations' }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · undaang` : 'undaang'
})
