import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from './views/DashboardView.vue'
import RecordView from './views/RecordView.vue'
import SettingsView from './views/SettingsView.vue'
import SessionDetailView from './views/SessionDetailView.vue'

const routes = [
    {
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: DashboardView,
        meta: { title: 'Strength and Conditioning Analytics' }
    },
    {
        path: '/record',
        name: 'Record',
        component: RecordView,
        meta: { title: 'Program Record' }
    },
    {
        path: '/program/session',
        name: 'SessionDetail',
        component: SessionDetailView,
        meta: { title: 'Edit Session' }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView,
        meta: { title: 'Settings' }
    }
]

const router = createRouter({
    // Using hash history is often safer for LINE Mini Apps where URL paths shouldn't hit the server
    history: createWebHashHistory(),
    routes
})

export default router
