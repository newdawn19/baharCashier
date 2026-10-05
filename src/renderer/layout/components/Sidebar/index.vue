<template>
  <div class="sidebar-inner">
    <!-- 品牌区：收起箭头 / 应用名 / 门店名 / 操作员（对标竞品 .logo 的四行信息） -->
    <div class="sidebar-brand">
      <i class="brand-toggle" :class="isCollapse ? 'el-icon-d-arrow-right' : 'el-icon-d-arrow-left'"
        @click="toggleSideBar"></i>
      <div class="brand-title">收银台</div>
      <div v-if="storeName" class="brand-store">({{ storeName }})</div>
      <div class="brand-account">您好，{{ userName || '管理员' }}！</div>
    </div>

    <!-- 图标导航 -->
    <ul class="sidebar-nav">
      <li v-for="route in navList" :key="route.path" class="nav-item">
        <div class="nav-link" :class="{ 'is-active': route.path === $route.path }" @click="go(route)">
          <span class="nav-icon">
            <svg-icon :icon-class="(route.meta && route.meta.icon) || 'table'"></svg-icon>
          </span>
          <span>{{ (route.meta && route.meta.title) || '' }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
import { useAppStore } from "@/store/app"
import { usePermissionStore } from "@/store/permission"
import { useUserStore } from "@/store/user"

export default {
  name: 'Sidebar',
  setup() {
    // 不能直接解构 Pinia store：解构会丢失响应性，
    // 而 permission.routers 是被整体替换的，必须保留 store 引用再取。
    const appStore = useAppStore()
    const permissionStore = usePermissionStore()
    const userStore = useUserStore()
    return { appStore, permissionStore, userStore }
  },
  computed: {
    isCollapse() {
      return !this.appStore.sidebarStatus.opened
    },
    userName() {
      return this.userStore.name
    },
    storeName() {
      // 门店名由收银台 init 成功后写入 localStorage。
      // 取不到就不显示这一行，不虚构接口。
      try {
        return localStorage.getItem('storeName') || ''
      } catch (e) {
        return ''
      }
    },
    navList() {
      // 路由表只有一层父子结构（/cashier + N 个子路由），侧栏要的是叶子节点本身，
      // 所以先把 children 摊平再渲染，否则会退化成 el-submenu 二级折叠菜单。
      return this.flatten(this.permissionStore.routers, '')
    }
  },
  methods: {
    flatten(routes, basePath, out) {
      const result = out || []
      ;(routes || []).forEach(r => {
        if (!r || r.hidden) return
        const full = this.join(basePath, r.path)
        if (r.children && r.children.length > 0) {
          this.flatten(r.children, full, result)
        } else {
          result.push(Object.assign({}, r, { path: full }))
        }
      })
      return result
    },
    join(base, path) {
      if (!path) return base || ''
      if (/^https?:\/\//.test(path)) return path
      if (path.charAt(0) === '/') return path
      return (base || '').replace(/\/+$/, '') + '/' + path
    },
    toggleSideBar() {
      this.appStore.ToggleSideBar()
    },
    go(route) {
      if (route.path && route.path !== this.$route.path) {
        this.$router.push(route.path)
      }
    }
  }
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.sidebar-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.sidebar-nav {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}
</style>
