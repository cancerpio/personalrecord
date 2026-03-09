import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from './views/DashboardView.vue'
import ProgramView from './views/ProgramView.vue'
import LogView from './views/LogView.vue'
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
        path: '/program',
        name: 'Program',
        component: ProgramView,
        meta: { title: 'Program Record' }
    },
    {
        path: '/program/session',
        name: 'SessionDetail',
        component: SessionDetailView,
        meta: { title: 'Edit Session' }
    },
    {
        path: '/log',
        name: 'Log',
        component: LogView,
        meta: { title: 'Training Logs' }
    }
]

const router = createRouter({
    // Using hash history is often safer for LINE Mini Apps where URL paths shouldn't hit the server
    history: createWebHashHistory(),
    routes
})

export default router
