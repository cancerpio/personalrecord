import { createApp } from 'vue'
import HighchartsVue from 'highcharts-vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

const app = createApp(App)
const pinia = createPinia()

app.use(HighchartsVue)
app.use(pinia)
app.use(router)
app.mount('#app')
