<template>
  <div class="cashier-page">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="收银台" name="cashier">
        <div class="cashier-body">
          <!-- 左：商品区 -->
          <div class="goods-pane">
            <div class="goods-toolbar">
              <el-input
                v-model="keyword"
                placeholder="搜索商品名称 / 条码"
                size="small"
                clearable
                style="width: 220px"
                @keyup.enter.native="doSearchGoods"
              >
                <el-button slot="append" icon="el-icon-search" @click="doSearchGoods" />
              </el-input>
              <span class="store-tip">{{ storeName }}</span>
            </div>

            <div class="cate-bar">
              <el-radio-group v-model="cateId" size="small" @change="onCateChange">
                <el-radio-button label="">全部</el-radio-button>
                <el-radio-button
                  v-for="c in cateList"
                  :key="c.id"
                  :label="String(c.id)"
                >{{ c.name }}</el-radio-button>
              </el-radio-group>
            </div>

            <div class="goods-grid">
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
                <div class="goods-price">￥{{ g.salePrice || g.price || 0 }}</div>
              </div>
              <div v-if="!goodsList.length" class="empty-tip">暂无商品</div>
            </div>
          </div>

          <!-- 右：购物车 + 结算 -->
          <div class="cart-pane">
            <div class="member-box">
              <el-input
                v-model="mobile"
                placeholder="输入会员手机号"
                size="small"
                style="width: 160px"
                @keyup.enter.native="doSearchMember"
              />
              <el-button size="small" type="primary" @click="doSearchMember">查询会员</el-button>
              <div v-if="memberInfo && memberInfo.id" class="member-info">
                {{ memberInfo.name || memberInfo.userNo }}
                <span v-if="memberInfo.mobile">（{{ memberInfo.mobile }}）</span>
                <span v-if="memberInfo.balance">余额 ￥{{ memberInfo.balance }}</span>
              </div>
            </div>

            <el-table :data="cart" size="small" height="320" style="width: 100%">
              <el-table-column prop="name" label="商品" min-width="110" show-overflow-tooltip />
              <el-table-column label="单价" width="70">
                <template slot-scope="s">￥{{ s.row.price }}</template>
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
            </el-table>

            <div class="total-box">
              <span>合计：</span>
              <span class="total-price">￥{{ totalPrice }}</span>
              <span class="total-count">共 {{ totalCount }} 件</span>
            </div>

            <div class="action-box">
              <el-button size="small" @click="doHangUpOrder">挂单</el-button>
              <el-button size="small" @click="showHangUpList">取单</el-button>
              <el-button size="small" @click="clearCart">清空</el-button>
              <el-button
                size="small"
                type="primary"
                :disabled="!cart.length"
                @click="openSettlement"
              >结算</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="订单" name="order">
        <orderList v-if="activeTab === 'order'" />
      </el-tab-pane>
      <el-tab-pane label="会员" name="member">
        <memberList v-if="activeTab === 'member'" />
      </el-tab-pane>
    </el-tabs>

    <!-- 结算弹窗 -->
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

    <!-- 支付结果 -->
    <payResultDialog
      :show-dialog="openPayResultDialog"
      :pay-result="payResult"
      @closeDialog="onCloseDialog"
      @showOrderPrint="onShowOrderPrint"
    />

    <!-- 扫码支付 -->
    <scanPayCodeDialog
      :show-dialog="openScanPayDialog"
      :order-id="orderId"
      :pay-amount="totalPrice"
      @closeDialog="onCloseDialog"
      @showPayResult="onShowPayResult"
    />

    <!-- 订单详情 -->
    <orderDetail
      :show-dialog="openOrderDetailDialog"
      :order-id="orderId"
      @closeDialog="onCloseDialog"
    />

    <!-- 打印 -->
    <orderPrintDialog
      :show-dialog="openPrintDialog"
      :order-id="orderId"
      @closeDialog="onCloseDialog"
    />

    <!-- 绑定员工 -->
    <bindStaffDialog
      :show-dialog="openBindStaffDialog"
      @closeDialog="onCloseDialog"
      @doBindStaff="onBindStaff"
    />

    <!-- 卡券核销 -->
    <userCoupon v-if="openUserCoupon" @doConfirmCoupon="onConfirmCoupon" />
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
import userCoupon from './components/userCoupon'
import orderList from './components/orderList'
import memberList from './components/memberList'

export default {
  name: 'CashierIndex',
  components: {
    settlementDialog, payResultDialog, scanPayCodeDialog, orderDetail,
    orderPrintDialog, bindStaffDialog, userCoupon, orderList, memberList
  },
  data() {
    return {
      activeTab: 'cashier',
      userId: 0,
      storeName: '',
      imagePath: '',
      cateList: [],
      goodsList: [],
      cateId: '',
      keyword: '',
      cart: [],
      totalPrice: '0.00',
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
      openUserCoupon: false
    }
  },
  computed: {
    totalCount() {
      return this.cart.reduce((n, item) => n + Number(item.num || 0), 0)
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
      init(this.userId, this.cateId, 1, 50).then(res => {
        const d = res.data || {}
        this.goodsList = d.goodsList || []
        this.cateList = d.cateList || []
        this.imagePath = d.imagePath || ''
        this.staffInfo = d.staffInfo || {}
        const store = d.storeInfo || {}
        this.storeName = store.name || ''
      }).catch(() => {})
    },
    imgUrl(img) {
      // 统一走后端静态资源根(imagePath)，缺省回退 API_HOST。
      // 否则相对路径会被解析到 dev-server(8088)，导致 /static/uploadFiles/** 404。
      return resolveFileUrl(img, this.imagePath)
    },
    onCateChange() {
      this.doSearchGoods()
    },
    doSearchGoods() {
      searchGoods({
        cateId: this.cateId,
        keyword: this.keyword,
        page: 1,
        pageSize: 50
      }).then(res => {
        const d = res.data || {}
        this.goodsList = d.goodsList || d.list || []
      }).catch(() => {})
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
      this.totalPrice = t.toFixed(2)
    },
    doSearchMember() {
      if (!this.mobile) return
      getMemberInfo({ mobile: this.mobile }).then(res => {
        this.memberInfo = res.data || {}
        this.couponList = (res.data && res.data.couponList) || []
      }).catch(() => {})
    },
    onSwitchMember() {
      this.openSettlementDialog = false
      this.$prompt('请输入会员手机号', '切换会员', {
        inputValue: this.mobile
      }).then(({ value }) => {
        this.mobile = value
        this.doSearchMember()
        this.openSettlementDialog = true
      }).catch(() => {})
    },
    openSettlement() {
      if (!this.cart.length) return
      this.openSettlementDialog = true
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
      if (!this.cart.length) return
      doHangUp({
        cartIds: this.cart.map(i => i.goodsId).join(','),
        remark: this.remark,
        userId: (this.memberInfo && this.memberInfo.id) || 0
      }).then(() => {
        this.$message.success('已挂单')
        this.clearCart()
      }).catch(() => {})
    },
    showHangUpList() {
      getHangUpList().then(res => {
        const list = (res.data && (res.data.list || res.data)) || []
        if (!list.length) {
          this.$message.info('暂无挂单')
          return
        }
        this.$message.info('挂单 ' + list.length + ' 笔')
      }).catch(() => {})
    },
    onBindStaff(staff) {
      this.staffInfo = staff || {}
      this.openBindStaffDialog = false
    },
    onConfirmCoupon(code) {
      this.openUserCoupon = false
      this.$message.info('核销券码：' + code)
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
.cashier-page { padding: 12px; }
.cashier-body { display: flex; gap: 12px; }
.goods-pane { flex: 1; min-width: 0; }
.cart-pane { width: 380px; border-left: 1px solid #ebeef5; padding-left: 12px; }
.goods-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.store-tip { color: #909399; font-size: 13px; }
.cate-bar { margin-bottom: 10px; }
.goods-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.goods-card {
  width: 118px; border: 1px solid #ebeef5; border-radius: 4px;
  padding: 8px; cursor: pointer; text-align: center;
}
.goods-card:hover { border-color: #409eff; }
.goods-img { height: 62px; line-height: 62px; overflow: hidden; }
.goods-img img { max-width: 100%; max-height: 62px; }
.no-img { font-size: 12px; color: #909399; }
.goods-name {
  font-size: 12px; margin-top: 4px; height: 32px;
  overflow: hidden; line-height: 16px;
}
.goods-price { color: #f56c6c; font-size: 13px; }
.empty-tip { color: #909399; padding: 20px; }
.member-box { margin-bottom: 10px; }
.member-info { margin-top: 6px; font-size: 12px; color: #606266; }
.total-box { margin: 10px 0; text-align: right; }
.total-price { color: #f56c6c; font-size: 20px; }
.total-count { margin-left: 8px; color: #909399; font-size: 12px; }
.action-box { display: flex; gap: 8px; justify-content: flex-end; }
</style>
