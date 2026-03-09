import { createApp } from 'vue'
import HighchartsVue from 'highcharts-vue'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(HighchartsVue)
app.use(router)
app.mount('#app')
