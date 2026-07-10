import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './styles/global.css'
import App from './App.vue'
import router from './router'

const logoUrl = new URL('../static/zjut.png', import.meta.url).href
const elementLocale = {
  ...zhCn,
  el: {
    ...zhCn.el,
    table: {
      ...zhCn.el.table,
      emptyText: '无相关数据'
    }
  }
}

document.title = '浙江工业大学反方教务管理系统'

const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']") || document.createElement('link')
icon.rel = 'icon'
icon.href = logoUrl
document.head.appendChild(icon)

createApp(App).use(createPinia()).use(router).use(ElementPlus, { locale: elementLocale }).mount('#app')
