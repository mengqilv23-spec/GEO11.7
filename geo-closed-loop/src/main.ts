import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { prefetchNavigationPagesWhenIdle } from './router/prefetch'
import './assets/main.css'
import './components/ui/ce/styles.css'

createApp(App).use(createPinia()).use(router).mount('#app')

void router.isReady().then(() => prefetchNavigationPagesWhenIdle())
