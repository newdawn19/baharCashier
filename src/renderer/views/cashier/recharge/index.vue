<template>
  <!--
    会员充值页。
    竞品是「弹窗叠在会员列表上」，我们做成独立页更好用，内容沿用竞品那套范式：
    预设档位（含赠送额）+ 自定义金额 + 三种支付方式 + 确认充值。
  -->
  <div class="recharge-page">
    <!-- 1. 会员查询 -->
    <div class="panel">
      <div class="panel-title">会员信息</div>
      <div class="member-search">
        <el-input
          v-model="keyword"
          placeholder="请输入会员手机号 / 会员号，或扫码会员二维码"
          class="search-input"
          clearable
          @keyup.enter.native="doSearchMember"
        />
        <el-button type="primary" icon="el-icon-search" @click="doSearchMember">查询会员</el-button>
      </div>

      <div v-if="memberInfo && memberInfo.id" class="member-card">
        <div class="avatar">
          <img v-if="memberAvatar" :src="memberAvatar" alt="">
          <i v-else class="el-icon-user-solid"></i>
        </div>
        <div class="meta">
          <div class="name">
            {{ memberInfo.name || '-' }}
            <span class="no">{{ memberInfo.userNo || '' }}</span>
          </div>
          <div class="row">手机号：{{ memberInfo.mobile || '-' }}</div>
          <div class="row">
            可用余额：<b class="amount">￥{{ Number(memberInfo.balance || 0).toFixed(2) }}</b>
            <span class="row">积分：{{ memberInfo.point || 0 }}</span>
          </div>
        </div>
      </div>

      <div v-else class="member-none">
        <span>当前未关联会员，请先查询会员</span>
        <el-button type="danger" size="mini" @click="doSearchMember">关联会员</el-button>
      </div>
    </div>

    <!-- 2. 充值方案 -->
    <div class="panel">
      <div class="panel-title">充值方案</div>
      <div class="tier-list">
        <div
          v-for="t in tiers"
          :key="t.amount"
          class="tier-card"
          :class="{ active: selectedTier === t.amount }"
          @click="selectTier(t)"
        >
          <div class="tier-amount">￥{{ t.amount }}</div>
          <div class="tier-give">送 ￥{{ t.gift }}</div>
        </div>
      </div>

      <div class="custom-row">
        <span class="label">自定义金额：</span>
        <el-input
          v-model="customAmount"
          placeholder="请输入充值金额（自定义金额不参与赠送）"
          class="custom-input"
          @input="onCustomInput"
        />
        <span class="unit">元</span>
      </div>
      <div class="tip-text">说明：多充多送，充值赠送金额，赠送卡券，机不可失时不再来！</div>
    </div>

    <!-- 3. 支付方式 -->
    <div class="panel">
      <div class="panel-title">支付方式</div>
      <el-radio-group v-model="payType" class="pay-types">
        <el-radio label="WECHAT">微信支付</el-radio>
        <el-radio label="ALIPAY">支付宝支付</el-radio>
        <el-radio label="CASH">现金支付</el-radio>
      </el-radio-group>
      <div class="tip-text">
        点击「确认充值」生成充值订单，然后使用扫码枪扫描顾客付款码完成收款。
      </div>
    </div>

    <!-- 4. 提交 -->
    <div class="submit-bar">
      <div class="summary">
        实收：<b class="amount">￥{{ Number(payAmount || 0).toFixed(2) }}</b>
        <span v-if="giftAmount > 0">赠送：￥{{ Number(giftAmount || 0).toFixed(2) }}</span>
      </div>
      <div>
        <el-button @click="onReset">取消</el-button>
        <el-button type="primary" :loading="loading" @click="onSubmit">确认充值</el-button>
      </div>
    </div>

    <!-- 扫码收款（微信/支付宝）：生成充值订单后用扫码枪收款 -->
    <scanPayCodeDialog
      :show-dialog="openScanDialog"
      :order-id="scanOrderId"
      :pay-amount="scanPayAmount"
      @closeDialog="openScanDialog = false"
      @showPayResult="onPayResult"
    />

    <balanceRecharge
      :show-dialog="openBalanceDialog"
      :user-id="(memberInfo && memberInfo.id) || 0"
      @close="openBalanceDialog = false"
    />
  </div>
</template>

<script>
import { getMemberInfo } from '@/api/cashier'
import { doRecharge, createRechargeOrder, getSettingInfo } from '@/api/balance'
import { resolveFileUrl } from '@/utils/bahar'
import balanceRecharge from '../components/balanceRecharge'
import scanPayCodeDialog from '../components/scanPayCodeDialog'

export default {
  name: 'CashierRecharge',
  components: { balanceRecharge, scanPayCodeDialog },
  data() {
    return {
      keyword: '',
      memberInfo: {},
      imagePath: '',
      // 预设充值档位（含赠送额），可按运营需要调整
      tiers: [
        { amount: 1000, gift: 50 },
        { amount: 3000, gift: 150 },
        { amount: 5000, gift: 200 },
        { amount: 10000, gift: 300 }
      ],
      selectedTier: 0,
      customAmount: '',
      payType: 'WECHAT',
      loading: false,
      openBalanceDialog: false,
      // 扫码收款：微信/支付宝走「生成充值订单 → 扫码枪收款」
      openScanDialog: false,
      scanOrderId: 0,
      scanPayAmount: 0
    }
  },
  mounted() {
    // 充值档位以后台配置的规则为准，取不到时回退到内置默认值
    this.loadRechargeRules()
  },
  computed: {
    memberAvatar() {
      const avatar = this.memberInfo && (this.memberInfo.avatar || this.memberInfo.headImg)
      return avatar ? resolveFileUrl(avatar, this.imagePath) : ''
    },
    // 自定义金额优先；否则取选中的档位
    payAmount() {
      const custom = Number(this.customAmount)
      if (custom > 0) return custom
      const tier = this.tiers.find(t => t.amount === this.selectedTier)
      return tier ? tier.amount : 0
    },
    giftAmount() {
      // 竞品规则：自定义金额不参与赠送
      if (Number(this.customAmount) > 0) return 0
      const tier = this.tiers.find(t => t.amount === this.selectedTier)
      return tier ? tier.gift : 0
    },
    payTypeName() {
      const map = { WECHAT: '微信支付', ALIPAY: '支付宝支付', CASH: '现金支付' }
      return map[this.payType] || '现金支付'
    }
  },
  methods: {
    doSearchMember() {
      if (!this.keyword) {
        this.$message.warning('请输入会员手机号或会员号')
        return
      }
      getMemberInfo({ mobile: this.keyword }).then(res => {
        this.memberInfo = res.data || {}
      }).catch(() => {
        this.memberInfo = {}
        this.$message.error('未查询到该会员')
      })
    },
    selectTier(tier) {
      this.selectedTier = this.selectedTier === tier.amount ? 0 : tier.amount
      this.customAmount = ''
    },
    onCustomInput() {
      // 输入自定义金额时取消档位选中
      if (Number(this.customAmount) > 0) {
        this.selectedTier = 0
      }
    },
    onReset() {
      this.selectedTier = 0
      this.customAmount = ''
      this.payType = 'WECHAT'
    },
    // 充值档位以后台「充值设置」为准（mt_setting 的 RECHARGE_RULE）
    loadRechargeRules() {
      getSettingInfo().then(res => {
        const d = (res && res.data) || {}
        const list = d.rechargeRuleList || []
        if (list.length) {
          this.tiers = list.map(i => ({
            amount: Number(i.rechargeAmount || 0),
            gift: Number(i.giveAmount || 0)
          })).filter(i => i.amount > 0)
        }
      }).catch(() => {
        // 取不到就沿用内置默认档位
      })
    },
    onSubmit() {
      const userId = this.memberInfo && this.memberInfo.id
      if (!userId) {
        this.$message.warning('请先查询并关联会员')
        return
      }
      const amount = Number(this.payAmount || 0)
      if (!(amount > 0)) {
        this.$message.warning('请选择充值档位或输入自定义金额')
        return
      }
      this.loading = true

      // 现金支付：直接入账（没有支付回调可走）
      if (this.payType === 'CASH') {
        doRecharge({
          userId: userId,
          amount: amount,
          giftAmount: this.giftAmount,
          remark: '支付方式：现金支付'
        }).then(() => {
          this.loading = false
          this.$message.success('充值成功')
          this.doSearchMember()
          this.onReset()
        }).catch(() => {
          this.loading = false
        })
        return
      }

      // 微信 / 支付宝：生成充值订单 → 扫码枪收款 → 后端回调自动入账
      createRechargeOrder({
        userId: userId,
        amount: amount,
        // 自定义金额不参与赠送，走后端 customAmount 分支
        customAmount: Number(this.customAmount) > 0 ? amount : 0,
        remark: '支付方式：' + this.payTypeName
      }).then(res => {
        this.loading = false
        const d = (res && res.data) || {}
        this.scanOrderId = d.orderId || 0
        this.scanPayAmount = Number(d.payAmount || amount)
        this.openScanDialog = true
      }).catch(() => {
        this.loading = false
      })
    },
    onPayResult(result) {
      this.openScanDialog = false
      if (result && result.isSuccess) {
        this.$message.success('充值成功')
        this.doSearchMember()
        this.onReset()
      } else {
        this.$message.error('收款未完成，充值未入账')
      }
    }
  },
}
</script>

<style lang="scss" scoped>
.recharge-page {
  height: calc(100vh - 82px); /* 82px = 38px 自定义标题栏 + 44px 顶栏 */
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
  box-sizing: border-box;
  background: #F5F5F5;
}

.panel {
  background: #FFFFFF;
  border-radius: 5px;
  padding: 12px 16px;
  margin-bottom: 10px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 10px;
}

.member-search {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  width: 456px;
  max-width: 100%;
}

.member-card {
  display: flex;
  align-items: center;
  padding: 10px;
  background: #F0F8FF;
  border-radius: 5px;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
  background: #E4E7ED;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 50px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  i {
    font-size: 28px;
    color: #909399;
  }
}

.meta {
  margin-left: 12px;

  .name {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .no {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
    font-weight: 400;
  }

  .row {
    font-size: 13px;
    color: #606266;
    line-height: 22px;
  }
}

.amount {
  color: #FF5B57;
}

.member-none {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #FEF0F0;
  border-radius: 5px;
  color: #606266;
  font-size: 13px;
}

.tier-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.tier-card {
  width: 130px;
  padding: 10px;
  border: 1px solid #DCDFE6;
  border-radius: 5px;
  cursor: pointer;
  text-align: center;

  &:hover {
    border-color: #00ACAC;
  }
}

.tier-card.active {
  border-color: #00ACAC;
  background: #F0F8FF;
  box-shadow: 0 2px 8px rgba(0, 172, 172, .2);
}

.tier-amount {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  line-height: 28px;
}

.tier-give {
  font-size: 13px;
  color: #FF5B57;
  line-height: 20px;
}

.custom-row {
  display: flex;
  align-items: center;
  margin-top: 12px;

  .label {
    font-size: 13px;
    color: #606266;
  }

  .custom-input {
    width: 260px;
  }

  .unit {
    margin-left: 8px;
    color: #909399;
  }
}

.tip-text {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.pay-types {
  margin-bottom: 4px;
}

.submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
  border-radius: 5px;
  padding: 12px 16px;
}

.summary {
  font-size: 14px;
  color: #606266;

  .amount {
    font-size: 22px;
    font-weight: 700;
  }

  span {
    margin-left: 12px;
  }
}
</style>
