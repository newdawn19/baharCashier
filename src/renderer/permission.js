import router from './router'
import Performance from '@/tools/performance'
import { usePermissionStore } from "@/store/permission"
import { useUserStore } from "@/store/user"

export function usePermission() {
    let end = null
    const whiteList = ['/login'] // 不重定向白名单
    router.beforeEach(async (to, from, next) => {
        const { GenerateRoutes, routers } = usePermissionStore()
        const { GetUserInfo, token, roles, logOut } = useUserStore()
        end = Performance.startExecute(`${from.path} => ${to.path} 路由耗时`) /// 路由性能监控
        if (token) {
            if (to.path === '/login') {
                next({ path: '/' })
            } else {
                const hasRoles = roles && roles.length > 0;
                if (hasRoles && routers && routers.length > 0) {
                    next()
                } else {
                    try {
                        const roles = await GetUserInfo()
                        const accessRoutes = await GenerateRoutes(roles)
                        // accessRoutes 只包含增量动态路由（不含 constantRouterMap）。
                        // 判重使用 vue-router 3 兼容写法：遍历 router.getRoutes() 比对 path
                        // （vue-router@3 不存在 router.hasRoute，那是 v4 的 API）。
                        accessRoutes.forEach(item => {
                            const exists = router.getRoutes().some(r => r.path === item.path)
                            if (!exists) {
                                router.addRoute(item)
                            }
                        })
                        // 显式重建目标 location，避免把 to.redirectedFrom 一并展开带入，
                        // 否则 vue-router 会认为守卫内再次发起重定向而抛出
                        // "Redirected when going from ... via a navigation guard"
                        next({ path: to.path, query: to.query, hash: to.hash, replace: true })
                    } catch (error) {
                        await logOut()
                        console.error(error)
                        next('/login')
                    }
                }

            }
        } else {
            if (whiteList.includes(to.path)) {
                next()
            } else {
                next('/login')
            }
        }

        setTimeout(() => {
            end()
        }, 0)
    })

    router.afterEach(() => { })
}
