import { createApp } from 'vue'
import HighchartsVue from 'highcharts-vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

import { useLiffStore } from './stores/liffStore'

const app = createApp(App)
const pinia = createPinia()

app.use(HighchartsVue)
app.use(pinia)

const liffStore = useLiffStore()

// 初始化 LIFF，確保在 Vue Router 載入與覆寫網址前完成，避免 liff.state 遺失導致無限登入迴圈
liffStore.initLiff().finally(async () => {
    app.use(router)
    await router.isReady() // 必須等待 Vue Router 解析完初始路由 (包含重新導向 / 到 /dashboard) 才能掛載，否則畫面會是白畫面
    app.mount('#app')
})

