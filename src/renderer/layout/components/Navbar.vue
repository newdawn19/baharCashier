<template>
  <el-menu :class="'navbar-header-fixed' + (isMac ? ' dragTitle' : '')" mode="horizontal">
    <div class="top-right">
      <div class="hb-bd">
        <hamburger class="hamburger-container" @toggle-click="toggleSideBar" :isActive="sidebarComp.opened"></hamburger>
        <breadcrumb></breadcrumb>
      </div>

      <div class="top-select">
        <div class="go-index">{{ time }}</div>
        <div class="select-right">
          <el-dropdown trigger="click">
            <div>
              <el-image :src="userImage" class="avatar">
                <div slot="error" class="image-slot">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </el-image>
              <div class="el-dropdown-link">
                你好： {{ userName }}
                <i class="el-icon-arrow-down el-icon--right"></i>
              </div>
            </div>
            <el-dropdown-menu slot="dropdown">
              <router-link to="/">
                <el-dropdown-item>返回首页</el-dropdown-item>
              </router-link>
              <el-dropdown-item @click.native="logout">
                <span>切换账号</span>
              </el-dropdown-item>
              <el-dropdown-item @click.native="logout">
                <span>退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>
    </div>
  </el-menu>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, defineComponent } from "vue";
import { useAppStore } from "@/store/app"
import { useUserStore } from "@/store/user"
import { format } from "date-fns";
import Breadcrumb from "@/components/Breadcrumb";
import Hamburger from "@/components/Hamburger";
import userImage from "@/assets/user.png"
import { Message } from "element-ui"
import { useRouter } from "@/hooks/use-router";

defineComponent({
  name: 'Navbar'
})

const time = ref("")
const isMac = process.platform === "darwin"
let timer = null
onMounted(() => {
  timer = setInterval(() => {
    time.value = format(new Date(), "yyyy/MM/dd HH:mm");
  }, 60000);
})
onUnmounted(() => {
  clearInterval(timer);
  timer = null;
})

const { ToggleSideBar, sidebarStatus } = useAppStore()
const sidebarComp = computed(() => sidebarStatus)
const toggleSideBar = () => {
  ToggleSideBar()
}

const { logOut, name } = useUserStore()
const router = useRouter()
const userName = computed(() => name)
const logout = () => {
  logOut().then(() => {
    Message({
      message: "退出成功",
      type: "success"
    });
    router.push('/login')
  })
}
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.navbar-header-fixed {
  transition: width 0.28s;
  // 侧栏由 256px 收窄到 160px
  width: calc(100% - 160px);
  display: flex;
  align-items: center;
  position: fixed;
  right: 0;
  z-index: 1002;
  // 62px -> 44px：收银台垂直空间寸土寸金。
  // 注意内部元素必须同步压缩，否则会撑破（见下方 hamburger/logo/padding）。
  height: 44px;

  .hamburger-container {
    line-height: 32px;
    height: 32px;
    float: left;
    padding: 0 10px;
  }

  .logo {
    width: 120px;
    height: 32px;
  }

  .top-right {
    display: flex;
    width: 100%;
    height: 100%;
    background-color: #ffffff;
    justify-content: space-between;
    padding: 0 12px;

    .hb-bd {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .avatar {
      width: 26px;
      height: 26px;
      margin-right: 8px;

      ::v-deep img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }
    }

    .top-select {
      display: flex;
      align-items: center;

      .go-index {
        color: #333333;
        font-weight: 400;
        margin-right: 20px;
        padding-right: 20px;
        border-right: 1px solid #cccccc;
      }

      .select-right ::v-deep .el-dropdown>span {
        font-size: 6px;
      }

      .select-right {
        .el-dropdown-link {
          color: #333333;
          font-weight: 400;
        }

        ::v-deep .el-dropdown-selfdefine {
          display: flex;
          align-items: center;
        }
      }
    }
  }
}

.dragTitle {
  -webkit-app-region: drag;
}
</style>

