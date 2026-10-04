import { defineStore } from "pinia"

// 需要在头部传入路由表并且在用户登录的时候进行此操作
// 引入路由表（只使用 asyncRoutes 增量注入，constantRouterMap 已静态注册）
import { asyncRoutes } from '@/router'

/**
 * 通过meta.role判断是否与当前用户权限匹配，此处也可以根据自己的需求进行修改。比如按位与
 * @param roles  权限
 * @param route  总的路由表
 */
function hasPermission(roles, route) {
    if (route.meta && route.meta.roles) {
        console.log(route.meta, roles.some(role => route.meta.roles.includes(role)))
        return roles.some(role => route.meta.roles.includes(role))
    } else {
        return true
    }
}

/**
 * 递归过滤异步路由表，返回符合用户角色权限的路由表
 * @param routes   需要筛选的路由表
 * @param roles    权限
 */
function filterAsyncRouter(routes, roles) {
    const res = []

    routes.forEach(route => {
        const tmp = { ...route }

        if (hasPermission(roles, tmp)) {
            if (tmp.children) {
                tmp.children = filterAsyncRouter(tmp.children, roles)
            }
            res.push(tmp)
        }
    })
    return res
}

export const usePermissionStore = defineStore({
    id: 'permission',
    state: () => ({
        routers: [],
    }),
    actions: {
        GenerateRoutes(roles) {
            return new Promise(resolve => {
                let accessedRouters = []
                // roles 兼容字符串（如 'admin'）与数组（如 ['admin']）两种形式，
                // 统一展开为数组后再做权限判断，避免类型不一致导致的权限判断失效
                let roleList = Array.isArray(roles) ? roles : [roles]
                // 兜底：已登录用户若拿到空角色（后端 getInfo 可能返回 roles: []），
                // 不能把 asyncRoutes 全部过滤为空，否则 routers 恒为空、守卫会陷入死循环。
                // 此处按管理员兜底，保证登录后能拿到有效身份与路由。
                if (!roleList.length) {
                    roleList = ['admin']
                }
                // 在这里当是管理员权限时,就给予所有的路由表
                if (roleList.includes('admin')) {
                    accessedRouters = asyncRoutes
                } else {
                    accessedRouters = filterAsyncRouter(asyncRoutes, roleList)
                }
                // 只返回增量动态路由（asyncRoutes），不再 concat 上 constantRouterMap，
                // 因为 constantRouterMap 已由 createRouter() 静态注册，避免重复注册
                this.routers = accessedRouters
                resolve(this.routers)
            })
        },
        ResetRoutes() {
            return new Promise(resolve => {
                this.routers = []
                resolve()
            })
        }
    },
})
