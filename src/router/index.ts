import { createRouter, createWebHistory } from 'vue-router'
import WelcomeView from '../views/WelcomeView.vue'
import LetterView from '../views/LetterView.vue'
import DrugView from '../views/DrugView.vue'
import ProductView from '../views/ProductView.vue'

const defaultLocale = 'pt-BR'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: `/${defaultLocale}`,
    },
    {
      path: '/:locale',
      name: 'welcome',
      component: WelcomeView,
    },
    {
      path: '/:locale/letter/:letter',
      name: 'letter',
      component: LetterView,
    },
    {
      path: '/:locale/drug/:slug',
      name: 'drug',
      component: DrugView,
    },
    {
      path: '/:locale/product/:id',
      name: 'product',
      component: ProductView,
    },
  ],
})
