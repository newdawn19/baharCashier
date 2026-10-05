<template>
  <div>
  <!--
    余额充值 / 扣减。
    沿用竞品那套范式：预设档位（含赠送额）+ 自定义金额 + 三种支付方式 + 确认充值。
  -->
  <el-dialog
    title="余额充值/扣减"
    :visible.sync="visible"
    width="760px"
    append-to-body
    @close="onClose"
  >
    <div class="member-line">
      会员信息：{{ memberNo }}（ID:{{ userId }}）
      <span class="balance">可用余额：￥{{ Number(balance || 0).toFixed(2) }}</span>
    </div>

    <div class="section-label">充值方案：</div>
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
      <span class="label">变更类型：</span>
      <el-radio-group v-model="form.changeType">
        <el-radio label="ADD">增加</el-radio>
        <el-radio label="SUB">扣减</el-radio>
      </el-radio-group>
    </div>

    <div class="custom-row">
      <span class="label">自定义金额：</span>
      <el-input
        v-model="customAmount"
        placeholder="请输入变更金额（自定义金额不参与赠送）"
        class="custom-input"
        @input="onCustomInput"
      />
      <span class="unit">元</span>
    </div>

    <div class="custom-row">
      <span class="label">支付方式：</span>
      <el-radio-group v-model="payType">
        <el-radio label="WECHAT">微信支付</el-radio>
        <el-radio label="ALIPAY">支付宝支付</el-radio>
        <el-radio label="CASH">现金支付</el-radio>
      </el-radio-group>
    </div>

    <div class="custom-row">
      <span class="label">备注信息：</span>
      <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注信息" class="remark-input" />
    </div>

    <div class="summary">
      本次变更：<b :class="form.changeType === 'SUB' ? 'amount-sub' : 'amount'">
        {{ form.changeType === 'SUB' ? '-' : '+' }}￥{{ Number(payAmount || 0).toFixed(2) }}
      </b>
      <span v-if="giftAmount > 0">赠送：￥{{ Number(giftAmount || 0).toFixed(2) }}</span>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="onClose">取 消</el-button>
      <el-button type="primary" :loading="loading" @click="onSubmit">确认充值</el-button>
    </div>
  </el-dialog>

  <!-- 扫码收款（微信/支付宝）：生成充值订单后用扫码枪收款 -->
  <scanPayCodeDialog
    :show-dialog="openScanDialog"
    :order-id="scanOrderId"
    :pay-amount="scanPayAmount"
    @closeDialog="openScanDialog = false"
    @showPayResult="onPayResult"
  />
  </div>
</template>

<script>
import { doRecharge, createRechargeOrder } from '@/api/balance'
import { Message } from 'element-ui'
import scanPayCodeDialog from './scanPayCodeDialog'

export default {
  name: 'BalanceRecharge',
  components: { scanPayCodeDialog },
  props: {
    showDialog: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 0 },
    // 会员号 / 当前余额，由调用方（会员列表行）传入，仅用于展示
    memberNo: { type: [String, Number], default: '' },
    balance: { type: [Number, String], default: 0 }
  },
  data() {
    return {
      visible: false,
      loading: false,
      tiers: [
        { amount: 1000, gift: 50 },
        { amount: 3000, gift: 150 },
        { amount: 5000, gift: 200 },
        { amount: 10000, gift: 300 }
      ],
      selectedTier: 0,
      customAmount: '',
      payType: 'WECHAT',
      form: { changeType: 'ADD', remark: '' },
      // 扫码收款（微信/支付宝走「生成充值订单 → 扫码枪收款」）
      openScanDialog: false,
      scanOrderId: 0,
      scanPayAmount: 0
    }
  },
  computed: {
    payAmount() {
      const custom = Number(this.customAmount)
      if (custom > 0) return custom
      const tier = this.tiers.find(t => t.amount === this.selectedTier)
      return tier ? tier.amount : 0
    },
    giftAmount() {
      if (this.form.changeType === 'SUB') return 0
      if (Number(this.customAmount) > 0) return 0
      const tier = this.tiers.find(t => t.amount === this.selectedTier)
      return tier ? tier.gift : 0
    },
    payTypeName() {
      const map = { WECHAT: '微信支付', ALIPAY: '支付宝支付', CASH: '现金支付' }
      return map[this.payType] || '现金支付'
    }
  },
  watch: {
    showDialog(val) {
      this.visible = val
      if (val) {
        this.selectedTier = 0
        this.customAmount = ''
        this.payType = 'WECHAT'
        this.form = { changeType: 'ADD', remark: '' }
      }
    }
  },
  methods: {
    selectTier(tier) {
      this.selectedTier = this.selectedTier === tier.amount ? 0 : tier.amount
      this.customAmount = ''
    },
    onCustomInput() {
      if (Number(this.customAmount) > 0) {
        this.selectedTier = 0
      }
    },
    onClose() {
      this.visible = false
      this.$emit('closeDialog', 'openBalance')
      this.$emit('close')
    },
    onSubmit() {
      const amount = Number(this.payAmount || 0)
      if (!(amount > 0)) {
        Message.warning('请选择充值档位或输入变更金额')
        return
      }
      this.loading = true
      const remark = [this.form.remark, '支付方式：' + this.payTypeName]
        .filter(Boolean).join('；')

      // 扣减没有支付环节，直接入账
      // 后端 doRecharge 用 type 区分增减（1 增加 / 2 扣减），金额一律传正数
      if (this.form.changeType === 'SUB') {
        doRecharge({
          userId: this.userId,
          amount: amount,
          type: 2,
          remark: remark
        }).then(() => {
          this.loading = false
          Message.success('扣减成功')
          this.$emit('success')
          this.onClose()
        }).catch(() => {
          this.loading = false
        })
        return
      }

      // 现金支付：直接入账（没有支付回调可走）
      if (this.payType === 'CASH') {
        doRecharge({
          userId: this.userId,
          amount: amount,
          type: 1,
          giftAmount: this.giftAmount,
          remark: remark
        }).then(() => {
          this.loading = false
          Message.success('充值成功')
          this.$emit('success')
          this.onClose()
        }).catch(() => {
          this.loading = false
        })
        return
      }

      // 微信 / 支付宝：生成充值订单 → 扫码枪收款 → 后端回调自动入账
      createRechargeOrder({
        userId: this.userId,
        amount: amount,
        customAmount: Number(this.customAmount) > 0 ? amount : 0,
        remark: remark
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
        Message.success('充值成功')
        this.$emit('success')
        this.onClose()
      } else {
        Message.error('收款未完成，充值未入账')
      }
    }
  }
}
</script>

<style scoped>
.member-line {
  font-size: 13px;
  color: #606266;
  margin-bottom: 12px;

  .balance {
    margin-left: 16px;
    color: #FF5B57;
  }
}

.section-label {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.tier-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tier-card {
  width: 119px;
  padding: 8px;
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
}

.tier-amount {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  line-height: 26px;
}

.tier-give {
  font-size: 13px;
  color: #FF5B57;
  line-height: 20px;
}

.custom-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;

  .label {
    width: 90px;
    font-size: 13px;
    color: #606266;
  }

  .custom-input {
    width: 260px;
  }

  .remark-input {
    width: 440px;
  }

  .unit {
    margin-left: 8px;
    color: #909399;
  }
}

.summary {
  margin-top: 12px;
  font-size: 14px;
  color: #606266;

  .amount {
    color: #FF5B57;
    font-size: 18px;
  }

  .amount-sub {
    color: #52C41A;
    font-size: 18px;
  }

  span {
    margin-left: 12px;
  }
}
</style>
