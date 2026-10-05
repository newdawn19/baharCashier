<template>
  <div class="app-wrapper" :class="IsUseSysTitle ? 'UseSysTitle' : 'NoUseSysTitle'">
    <div :class="classObj">
      <navbar></navbar>
      <div class="container-set">
        <sidebar class="sidebar-container" :class="IsUseSysTitle ? 'UseSysTitle' : 'NoUseSysTitle'"></sidebar>
        <div class="main-container">
          <app-main></app-main>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import AppMain from "./components/AppMain";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { useAppStore } from "@/store/app";
import { ipcRenderer } from "electron";

const { sidebarStatus } = useAppStore();
const IsUseSysTitle = ref(false);
const sidebarSwitch = computed(() => sidebarStatus.opened)

ipcRenderer.invoke("IsUseSysTitle").then(res => {
  IsUseSysTitle.value = res;
});

const classObj = computed(() => {
  return {
    hideSidebar: !sidebarSwitch.value,
    openSidebar: sidebarSwitch.value
  };
});

</script>

<style rel="stylesheet/scss" lang="scss" scoped>
@import "@/styles/mixin.scss";

.app-wrapper {
  @include clearfix;
  position: relative;
  height: 100%;
  width: 100%;

  .container-set {
    position: relative;
    // 顶栏由 62px 压缩到 44px（收银台寸土寸金，对标竞品无顶栏的做法尽量收窄）
    padding-top: 44px;
  }
}

.UseSysTitle {
  top: 0px;
}

.NoUseSysTitle {
  top: 38px
}
</style>
