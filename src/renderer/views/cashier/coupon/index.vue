<template>
  <!--
    卡券核销：列表视图 ↔ 核销专用子视图。
    竞品实测：点「核销」不是弹窗，而是整页切到只有三个元素的极简视图
    （核销码输入 + 确定核销 107×50 + 返回列表 107×50）——扫码枪场景的最优解。
    couponConfirm.vue 原本是全项目 0 引用的孤儿组件，这里把它接线进来。
  -->
  <div class="route-view">
    <userCoupon v-if="view === 'list'" @doConfirmCoupon="onConfirmCoupon" />
    <couponConfirm v-else :coupon-code="confirmCode" @doUserCoupon="backToList" />
  </div>
</template>

<script>
import userCoupon from '../components/userCoupon'
import couponConfirm from '../components/couponConfirm'

export default {
  name: 'CashierCoupon',
  components: { userCoupon, couponConfirm },
  data() {
    return {
      view: 'list',
      // 进入核销子视图时自动回填选中券的核销码
      confirmCode: ''
    }
  },
  methods: {
    onConfirmCoupon(code) {
      this.confirmCode = code || ''
      this.view = 'confirm'
    },
    backToList() {
      this.confirmCode = ''
      this.view = 'list'
    }
  }
}
</script>

<style lang="scss" scoped>
/* 可用高度 = 100vh - 82px
   82px = 38px 自定义标题栏 + 44px 顶栏 */
.route-view {
  height: calc(100vh - 82px);
  min-height: 0;
  overflow: hidden;
}
</style>
