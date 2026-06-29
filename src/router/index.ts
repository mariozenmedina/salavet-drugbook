import { createRouter, createWebHistory } from 'vue-router'
import WelcomeView from '../views/WelcomeView.vue'
import LetterView from '../views/LetterView.vue'
import DrugView from '../views/DrugView.vue'
import PrescriptionView from '../views/PrescriptionView.vue'

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
      path: '/:locale/prescription',
      name: 'prescription',
      component: PrescriptionView,
    },
  ],
})
