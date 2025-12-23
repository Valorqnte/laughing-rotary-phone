import { createRouter, createWebHistory } from 'vue-router';
import Adminhome from '@/views/Adminhome.vue';
import Login from '@/views/Login.vue';
import Userhome from '@/views/Userhome.vue';
import { authDirectAccess } from '@/stores/auth'


const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'Userhome',
            component: Userhome,
            meta: { requiresAuth: true, role: 'user' },
        },
        {
            path: '/login',
            name: 'Login',
            component: Login,
        },

        {
            path: '/Adminhome',
            name: 'Adminhome',
            component: Adminhome,
            meta: { requiresAuth: true, role: 'admin' },
        },

        ],
});

router.beforeEach((to, _from, next) => {
    const user = authDirectAccess.getUser()
    if (to.meta.requiresAuth && !user) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
    }
    if (to.meta.role === 'admin' && user?.role !== 'admin') {
        next({ name: 'Login' })
        return
    }
    if (to.meta.role === 'user' && user?.role === 'admin') {
        next({ name: 'Adminhome' })
        return
    }
    next()
})

export default router;
