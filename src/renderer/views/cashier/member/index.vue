<template>
  <div class="route-view">
    <member-list />
  </div>
</template>

<script>
import MemberList from '../components/memberList'

export default {
  name: 'CashierMember',
  components: { MemberList }
}
</script>

<style lang="scss" scoped>
/* 可用高度 = 100vh - 82px
   82px = 38px 自定义标题栏(IsUseSysTitle=false 时的 window-title) + 44px 顶栏 */
.route-view {
  height: calc(100vh - 82px);
  min-height: 0;
  overflow: hidden;
}

/* 覆盖 memberList 内部基于旧视口的固定高度，改由 route-view 撑开 */
.route-view ::v-deep .member-container {
  height: calc(100% - 20px);
}
</style>
