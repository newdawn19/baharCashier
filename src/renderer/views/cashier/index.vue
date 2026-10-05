<template>
  <!--
    收银主页三段式布局（对标竞品：导航 160 : 购物车 310 : 商品区 剩余）
    左：购物车（70px 会员头 / 滚动列表 / 120px 金额+大按钮）
    右：商品区（106px 工具条 / 滚动栅格 / 50px 分页）
    整页不滚动，只有 cart-body 与 goods-grid 内部滚动。
    一律用 flex 实现，不用 position:fixed —— fixed 在 Electron 下锚定对象不确定，
    且 absolute + 百分比高度曾导致祖先高度塌陷（orderList/memberList 已踩过）。
  -->
  <div class="cashier-page">
    <!-- ============ 左：购物车 ============ -->
    <div class="cart-pane">
      <!-- 会员头 70px -->
      <div class="cart-head">
        <div class="cart-head-avatar">
          <img v-if="memberAvatar" :src="memberAvatar" alt="">
          <i v-else class="el-icon-user-solid"></i>
        </div>
        <div class="cart-head-info">
          <div v-if="memberInfo && memberInfo.id" class="member-name">
            {{ memberInfo.name || memberInfo.userNo }}
            <span v-if="memberInfo.balance">余额 ￥{{ Number(memberInfo.balance || 0).toFixed(2) }}</span>
          </div>
          <div v-else class="member-name">当前为游客</div>
        </div>
        <el-button
          class="btn-switch"
          type="danger"
          size="mini"
          icon="el-icon-refresh"
          @click="onSwitchMember"
        >关联会员</el-button>
      </div>

      <!-- 购物车列表（自适应高度，替代原写死的 height="320"） -->
      <div class="cart-body">
        <div class="cart-body-bar">
          <span class="cart-title">购物车</span>
          <el-button v-if="cart.length" type="text" size="mini" @click="clearCart">清空</el-button>
        </div>
        <el-table :data="cart" size="small" height="100%" style="width: 100%">
          <el-table-column prop="name" label="商品" min-width="110" show-overflow-tooltip />
          <el-table-column label="单价" width="70">
            <template slot-scope="s">￥{{ Number(s.row.price || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="数量" width="110">
            <template slot-scope="s">
              <el-input-number
                v-model="s.row.num"
                :min="1"
                size="mini"
                @change="recalcTotal"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="50">
            <template slot-scope="s">
              <el-button type="text" size="mini" @click="removeFromCart(s.$index)">删除</el-button>
            </template>
          </el-table-column>
          <template slot="empty">
            <span class="cart-empty">暂无结算商品</span>
          </template>
        </el-table>
      </div>

      <!-- 金额 + 两个大按钮 120px -->
      <div class="cart-foot">
        <div class="cart-foot-total">
          <div class="row">
            <span>总件数：</span><b>{{ totalCount }}</b>
          </div>
          <div class="row">
            <span>总金额：</span><b class="big">￥{{ Number(totalPrice || 0).toFixed(2) }}</b>
          </div>
        </div>
        <div class="cart-foot-btns">
          <div class="big-btn btn-hold" @click="openHangUpList">挂单 / 取单</div>
          <div class="big-btn btn-pay" @click="onMainPayClick">
            {{ cart.length ? '结算收款' : '无商品收款' }}
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 右：商品区 ============ -->
    <div class="goods-pane">
      <!-- 工具条 106px -->
      <div class="goods-toolbar">
        <div class="goods-toolbar-row">
          <el-input
            v-model="keyword"
            placeholder="请输入商品关键字：商品名称、条码、商品ID..."
            clearable
            class="goods-search"
            @keyup.enter.native="doSearchGoods"
          />
          <el-button class="btn-search" type="primary" icon="el-icon-search" @click="doSearchGoods">
            查询商品
          </el-button>
          <div class="view-switch">
            <span :class="['item', { active: goodsView === 'small' }]" @click="goodsView = 'small'">
              <i class="el-icon-menu"></i>小图
            </span>
            <span :class="['item', { active: goodsView === 'large' }]" @click="goodsView = 'large'">
              <i class="el-icon-s-grid"></i>大图
            </span>
          </div>
        </div>
        <el-tabs v-model="cateId" type="card" class="cate-tabs" @tab-click="onCateChange">
          <el-tab-pane label="全部" name="" />
          <el-tab-pane v-for="c in cateList" :key="c.id" :label="c.name" :name="String(c.id)" />
        </el-tabs>
      </div>

      <!-- 商品栅格（内部滚动） -->
      <div class="goods-grid" :class="goodsView === 'large' ? 'is-large' : 'is-small'">
        <div
          v-for="g in goodsList"
          :key="g.id"
          class="goods-card"
          @click="addToCart(g)"
        >
          <div class="goods-img">
            <img v-if="imgUrl(g.logo || g.image)" :src="imgUrl(g.logo || g.image)" :alt="g.name">
            <span v-else class="no-img">{{ g.name }}</span>
          </div>
          <div class="goods-name">{{ g.name }}</div>
          <div class="goods-price">￥{{ Number(g.salePrice || g.price || 0).toFixed(2) }}</div>
        </div>
        <div v-if="!goodsList.length" class="empty-tip">暂无商品</div>
      </div>

      <!-- 商品分页 -->
      <div class="goods-pager">
        <el-pagination
          layout="total, sizes, prev, pager, next, jumper"
          :total="goodsTotal"
          :page-size="goodsPageSize"
          :current-page="goodsPage"
          :page-sizes="[20, 30, 50, 100]"
          @size-change="onPageSizeChange"
          @current-change="onPageChange"
        />
      </div>
    </div>

    <!-- ============ 弹窗 ============ -->
    <settlementDialog
      :show-dialog="openSettlementDialog"
      :member-info="memberInfo"
      :staff-info="staffInfo"
      :order-info="orderInfo"
      :coupon-list="couponList"
      :total-price="Number(totalPrice)"
      :remarks="remark"
      @closeDialog="onCloseDialog"
      @submit="onSubmitSettlement"
      @switchMember="onSwitchMember"
      @bindStaff="openBindStaffDialog = true"
    />

    <payResultDialog
      :show-dialog="openPayResultDialog"
      :pay-result="payResult"
      @closeDialog="onCloseDialog"
      @showOrderPrint="onShowOrderPrint"
    />

    <scanPayCodeDialog
      ref="scanPayCodeDialog"
      :show-dialog="openScanPayDialog"
      :order-id="orderId"
      :pay-amount="totalPrice"
      @closeDialog="onCloseDialog"
      @showPayResult="onShowPayResult"
    />

    <orderDetail
      :show-dialog="openOrderDetailDialog"
      :order-id="orderId"
      @closeDialog="onCloseDialog"
    />

    <orderPrintDialog
      :show-dialog="openPrintDialog"
      :order-info="orderInfo"
      :store-info="storeInfo"
      @closeDialog="onCloseDialog"
    />

    <bindStaffDialog
      :show-dialog="openBindStaffDialog"
      @closeDialog="onCloseDialog"
      @doBindStaff="onBindStaff"
    />

    <!-- 挂单列表（原来只能挂不能取，这里补上取单 UI） -->
    <hangUpList
      ref="hangUpList"
      :show-dialog="openHangUpDialog"
      @closeDialog="openHangUpDialog = false"
      @hangUp="doHangUpOrder"
      @takeUp="onTakeUp"
    />

    <!-- 无商品收款（代客下单的等价入口） -->
    <noGoodsPayDialog
      :show-dialog="openNoGoodsPayDialog"
      @closeDialog="openNoGoodsPayDialog = false"
      @submit="onSubmitNoGoodsPay"
    />
  </div>
</template>

<script>
import { getInfo } from '@/api/login'
import { resolveFileUrl } from '@/utils/bahar'
import {
  init, searchGoods, getMemberInfo, submitSettlement,
  doHangUp, getHangUpList
} from '@/api/cashier'
import settlementDialog from './components/settlementDialog'
import payResultDialog from './components/payResultDialog'
import scanPayCodeDialog from './components/scanPayCodeDialog'
import orderDetail from './components/orderDetail'
import orderPrintDialog from './components/orderPrintDialog'
import bindStaffDialog from './components/bindStaffDialog'
import hangUpList from './components/hangUpList'
import noGoodsPayDialog from './components/noGoodsPayDialog'

export default {
  name: 'CashierIndex',
  components: {
    settlementDialog, payResultDialog, scanPayCodeDialog, orderDetail,
    orderPrintDialog, bindStaffDialog, hangUpList, noGoodsPayDialog
  },
  data() {
    return {
      userId: 0,
      storeName: '',
      imagePath: '',
      cateList: [],
      goodsList: [],
      cateId: '',
      keyword: '',
      goodsView: 'small',
      goodsPage: 1,
      goodsPageSize: 50,
      goodsTotal: 0,
      cart: [],
      totalPrice: 0,
      remark: '',
      mobile: '',
      memberInfo: {},
      staffInfo: {},
      orderInfo: {},
      couponList: [],
      payResult: {},
      orderId: 0,
      openSettlementDialog: false,
      openPayResultDialog: false,
      openScanPayDialog: false,
      openOrderDetailDialog: false,
      openPrintDialog: false,
      openBindStaffDialog: false,
      openHangUpDialog: false,
      openNoGoodsPayDialog: false
    }
  },
  computed: {
    totalCount() {
      return this.cart.reduce((n, item) => n + Number(item.num || 0), 0)
    },
    // orderPrintDialog 需要 { name } 结构的店铺信息，由 storeName 构造。
    storeInfo() {
      return { name: this.storeName }
    },
    memberAvatar() {
      const avatar = this.memberInfo && (this.memberInfo.avatar || this.memberInfo.headImg)
      // 走统一静态资源解析：相对路径会被解析到 dev-server(8088) 导致 404
      return avatar ? resolveFileUrl(avatar, this.imagePath) : ''
    }
  },
  mounted() {
    this.loadAccount()
  },
  methods: {
    loadAccount() {
      getInfo().then(res => {
        const info = (res.data && res.data.accountInfo) || {}
        this.userId = info.id || 0
        this.loadInit()
      }).catch(() => {
        this.loadInit()
      })
    },
    loadInit() {
      init(this.userId, this.cateId, this.goodsPage, this.goodsPageSize).then(res => {
        const d = res.data || {}
        this.goodsList = d.goodsList || []
        this.cateList = d.cateList || []
        this.imagePath = d.imagePath || ''
        this.staffInfo = d.staffInfo || {}
        this.goodsTotal = Number(d.total || this.goodsList.length || 0)
        const store = d.storeInfo || {}
        this.storeName = store.name || ''
        // 侧栏品牌区要显示门店名，这里写进 localStorage（侧栏没有 init 数据）
        if (this.storeName) {
          try {
            localStorage.setItem('storeName', this.storeName)
          } catch (e) { /* localStorage 不可用时忽略 */ }
        }
      }).catch(() => {})
    },
    imgUrl(img) {
      // 统一走后端静态资源根(imagePath)，缺省回退 API_HOST。
      // 否则相对路径会被解析到 dev-server(8088)，导致 /static/uploadFiles/** 404。
      return resolveFileUrl(img, this.imagePath)
    },
    onCateChange() {
      this.goodsPage = 1
      this.doSearchGoods()
    },
    doSearchGoods() {
      searchGoods({
        cateId: this.cateId,
        keyword: this.keyword,
        page: this.goodsPage,
        pageSize: this.goodsPageSize
      }).then(res => {
        // searchGoods 后端直接返回裸数组（data 即 list），而 init 返回的是 { goodsList: [...] }，
        // 两种形状都要兼容，否则搜索结果恒为空。
        const d = res.data
        const list = Array.isArray(d) ? d : ((d && (d.goodsList || d.list)) || [])
        this.goodsList = list
        this.goodsTotal = Number((d && d.total) || list.length || 0)
      }).catch(() => {})
    },
    onPageChange(page) {
      this.goodsPage = page
      this.doSearchGoods()
    },
    onPageSizeChange(size) {
      this.goodsPageSize = size
      this.goodsPage = 1
      this.doSearchGoods()
    },
    addToCart(goods) {
      const exist = this.cart.find(i => i.goodsId === goods.id)
      if (exist) {
        exist.num += 1
      } else {
        this.cart.push({
          goodsId: goods.id,
          skuId: goods.skuId || 0,
          name: goods.name,
          price: Number(goods.salePrice || goods.price || 0),
          num: 1
        })
      }
      this.recalcTotal()
    },
    removeFromCart(idx) {
      this.cart.splice(idx, 1)
      this.recalcTotal()
    },
    clearCart() {
      this.cart = []
      this.recalcTotal()
    },
    recalcTotal() {
      const t = this.cart.reduce(
        (sum, i) => sum + Number(i.price) * Number(i.num || 0), 0)
      // 保留为 Number：金额既要展示(￥xx.xx)也要做计算，
      // 存字符串会让子组件 payAmount 的 Number 类型校验失败。
      // 展示时由模板统一 toFixed(2)。
      this.totalPrice = Number(t.toFixed(2))
    },
    doSearchMember() {
      if (!this.mobile) return
      getMemberInfo({ mobile: this.mobile }).then(res => {
        this.memberInfo = res.data || {}
        this.couponList = (res.data && res.data.couponList) || []
      }).catch(() => {})
    },
    onSwitchMember() {
      // 购物车头部空间只有 70px，放不下输入框，改用 prompt 关联会员
      this.$prompt('请输入会员手机号', '关联会员', {
        inputValue: this.mobile,
        inputPlaceholder: '请输入会员手机号、会员名称或扫码会员二维码'
      }).then(({ value }) => {
        this.mobile = value
        this.doSearchMember()
      }).catch(() => {})
    },
    openSettlement() {
      if (!this.cart.length) return
      this.openSettlementDialog = true
    },
    // 底部红色大按钮：有商品走结算，空车走无商品收款
    onMainPayClick() {
      if (this.cart.length) {
        this.openSettlement()
      } else {
        this.openNoGoodsPayDialog = true
      }
    },
    onSubmitSettlement(payload) {
      const first = this.cart[0] || {}
      const param = {
        type: 'cart',
        payType: payload.payType,
        payAmount: payload.totalPrice,
        cashierPayAmount: payload.totalPrice,
        cashierDiscountAmount: payload.discountPrice || '0',
        remark: payload.remark || '',
        couponId: payload.userCouponId || 0,
        userId: (this.memberInfo && this.memberInfo.id) || 0,
        mobile: this.mobile || '',
        staffId: (this.staffInfo && this.staffInfo.id) || 0,
        goodsId: first.goodsId,
        skuId: first.skuId,
        buyNum: first.num,
        cartIds: this.cart.map(i => i.goodsId).join(',')
      }
      submitSettlement(param).then(res => {
        this.openSettlementDialog = false
        this.orderId = (res.data && res.data.orderId) || 0
        this.orderInfo = res.data || {}
        this.payResult = { isSuccess: true, payAmount: payload.totalPrice }
        if (payload.payType === 'SCAN' || payload.payType === 'WECHAT') {
          this.openScanPayDialog = true
        } else {
          this.openPayResultDialog = true
        }
      }).catch(() => {
        this.payResult = { isSuccess: false }
        this.openPayResultDialog = true
      })
    },
    // 无商品收款（代客下单等价形态）：只带金额与备注下单
    onSubmitNoGoodsPay(payload) {
      const param = {
        type: 'noGoods',
        payType: payload.payType || 'CASH',
        payAmount: payload.amount,
        cashierPayAmount: payload.amount,
        cashierDiscountAmount: '0',
        remark: payload.remark || '',
        couponId: 0,
        userId: (this.memberInfo && this.memberInfo.id) || 0,
        mobile: this.mobile || '',
        staffId: (this.staffInfo && this.staffInfo.id) || 0,
        cartIds: ''
      }
      submitSettlement(param).then(res => {
        this.openNoGoodsPayDialog = false
        this.orderId = (res.data && res.data.orderId) || 0
        this.orderInfo = res.data || {}
        this.payResult = { isSuccess: true, payAmount: payload.amount }
        if (param.payType === 'SCAN' || param.payType === 'WECHAT') {
          this.openScanPayDialog = true
        } else {
          this.openPayResultDialog = true
        }
      }).catch(() => {
        this.$message.error('收款失败，请检查后端是否支持无商品收款')
      })
    },
    onShowPayResult(result) {
      this.openScanPayDialog = false
      this.payResult = result || {}
      this.openPayResultDialog = true
      if (result && result.isSuccess) {
        this.cart = []
        this.recalcTotal()
      }
    },
    onShowOrderPrint(orderId) {
      this.orderId = orderId || this.orderId
      this.openPayResultDialog = false
      this.openPrintDialog = true
    },
    doHangUpOrder() {
      if (!this.cart.length) {
        this.$message.warning('购物车为空，无法挂单')
        return
      }
      doHangUp({
        cartIds: this.cart.map(i => i.goodsId).join(','),
        remark: this.remark,
        userId: (this.memberInfo && this.memberInfo.id) || 0
      }).then(() => {
        this.$message.success('已挂单')
        this.clearCart()
        this.openHangUpDialog = false
      }).catch(() => {})
    },
    openHangUpList() {
      this.openHangUpDialog = true
      if (this.$refs.hangUpList) {
        this.$refs.hangUpList.load()
      }
    },
    onTakeUp(item) {
      // 取单：把挂单里的商品还原回购物车
      const goodsList = (item && (item.goodsList || item.cartList)) || []
      if (!goodsList.length) {
        this.$message.info('该挂单没有商品明细')
        return
      }
      goodsList.forEach(g => {
        this.addToCart({
          id: g.goodsId || g.id,
          skuId: g.skuId || 0,
          name: g.name || g.goodsName,
          salePrice: g.price || g.salePrice
        })
      })
      this.$message.success('已取单')
      this.openHangUpDialog = false
    },
    onBindStaff(staff) {
      this.staffInfo = staff || {}
      this.openBindStaffDialog = false
    },
    onCloseDialog(name) {
      const map = {
        settlementDialog: 'openSettlementDialog',
        payResultDialog: 'openPayResultDialog',
        scanPayCodeDialog: 'openScanPayDialog',
        printOrder: 'openPrintDialog',
        openBindStaffDialog: 'openBindStaffDialog'
      }
      const key = map[name]
      if (key) this[key] = false
      if (name === 'payResultDialog') {
        this.openOrderDetailDialog = false
      }
    }
  }
}
</script>

<style scoped>
/* 可用高度 = 100vh - 82px
   82px = 38px 自定义标题栏(IsUseSysTitle=false 时的 window-title) + 44px 顶栏
   顶栏高度见 layout/index.vue .container-set padding-top */
.cashier-page {
  display: flex;
  height: calc(100vh - 82px);
  min-height: 0;
  overflow: hidden;
  background: #F5F5F5;
}

/* ---------- 左：购物车 310px ---------- */
.cart-pane {
  flex: 0 0 310px;
  width: 310px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #FFFFFF;
}

.cart-head {
  flex: 0 0 70px;
  height: 70px;
  background: #6C757D;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  padding: 0 12px;
  box-sizing: border-box;
}

.cart-head-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, .25);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 30px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i {
    font-size: 18px;
  }
}

.cart-head-info {
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 10px;
}

.member-name {
  font-size: 13px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span {
    display: block;
    font-size: 12px;
    opacity: .85;
  }
}

.btn-switch {
  flex: 0 0 auto;
}

.cart-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cart-body-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #EBEEF5;
}

.cart-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.cart-empty {
  color: #909399;
  font-size: 13px;
}

.cart-foot {
  flex: 0 0 120px;
  height: 120px;
  background: #6C757D;
  color: #FFFFFF;
  padding: 8px 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cart-foot-total {
  text-align: right;

  .row {
    font-size: 13px;
    line-height: 20px;
  }

  .big {
    font-size: 22px;
    font-weight: 700;
  }
}

.cart-foot-btns {
  display: flex;
  gap: 10px;
}

.big-btn {
  flex: 1 1 0;
  height: 50px;
  line-height: 50px;
  text-align: center;
  border-radius: 5px;
  font-size: 16px;
  color: #FFFFFF;
  cursor: pointer;
  user-select: none;
}

.btn-hold {
  background: #00ACAC;
}

.btn-pay {
  background: #FF5B57;
}

/* ---------- 右：商品区 ---------- */
.goods-pane {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  margin-left: 5px;
}

.goods-toolbar {
  flex: 0 0 106px;
  height: 106px;
  padding: 5px;
  box-sizing: border-box;
  background: #FFFFFF;
}

.goods-toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 50px;
}

.goods-search {
  width: 456px;
  max-width: 100%;
}

.goods-search ::v-deep .el-input__inner {
  height: 50px;
  line-height: 50px;
  border-color: #00ACAC;
}

.btn-search {
  width: 116px;
  height: 50px;
  background: #00ACAC;
  border-color: #00ACAC;
}

.view-switch {
  margin-left: auto;
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: #909399;

  .item {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .item.active {
    color: #00ACAC;
    background: #F0F8FF;
  }
}

.cate-tabs {
  height: 51px;
}

.cate-tabs ::v-deep .el-tabs__header {
  margin: 0;
}

.cate-tabs ::v-deep .el-tabs__item {
  height: 40px;
  line-height: 40px;
}

.cate-tabs ::v-deep .el-tabs__item.is-active {
  color: #00ACAC;
}

.goods-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  /* 注意：竞品用 padding-top:103px 给 position:fixed 顶条让位。
     我们改 flex 后顶条在流内自然占位，这里不能再加 padding，否则首行被推下去。 */
  padding: 4px;
  box-sizing: border-box;
  align-content: flex-start;
}

.goods-grid.is-small {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}

.goods-grid.is-large {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.goods-card {
  background: #F0F8FF;
  border-radius: 4px;
  padding: 4px;
  cursor: pointer;
  box-sizing: border-box;
  overflow: hidden;
}

.goods-card:hover {
  box-shadow: 0 2px 8px rgba(0, 172, 172, .25);
}

.goods-img {
  overflow: hidden;
  background: #FFFFFF;
  border-radius: 4px;
}

.is-small .goods-img {
  height: 100px;
  line-height: 100px;
}

.is-large .goods-img {
  height: 150px;
  line-height: 150px;
}

.goods-img img {
  max-width: 100%;
  max-height: 100%;
}

.no-img {
  font-size: 12px;
  color: #909399;
}

.goods-name {
  margin-top: 4px;
  font-size: 12px;
  color: #666666;
  line-height: 16px;
  height: 32px;
  overflow: hidden;
}

.goods-price {
  font-size: 12px;
  color: #FF5B57;
  line-height: 16px;
}

.empty-tip {
  color: #909399;
  padding: 20px;
  grid-column: 1 / -1;
}

.goods-pager {
  flex: 0 0 50px;
  height: 50px;
  background: #6C757D;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
  box-sizing: border-box;
}

.goods-pager ::v-deep .el-pagination {
  color: #FFFFFF;
}

.goods-pager ::v-deep .el-pagination__total,
.goods-pager ::v-deep .el-pagination__jump {
  color: #FFFFFF;
}
</style>
