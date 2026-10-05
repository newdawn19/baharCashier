<template>
  <!--
    无商品收款：不经过购物车直接收款（代客下单的等价入口）。
    竞品实测 700×336：收款金额 + 备注信息 + 确定收款/取消。
  -->
  <el-dialog
    title="无商品收款"
    :visible.sync="visible"
    width="700px"
    append-to-body
    @closed="$emit('closeDialog')"
  >
    <el-form label-width="100px">
      <el-form-item label="收款金额：">
        <el-input
          v-model="amount"
          placeholder="请输入收款金额"
          style="width: 260px"
          @keyup.enter.native="submit"
        />
        <span class="unit">（ 单位：元 ）</span>
      </el-form-item>
      <el-form-item label="备注信息：">
        <el-input
          v-model="remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息"
          style="width: 440px"
        />
      </el-form-item>
      <el-form-item label="支付方式：">
        <el-radio-group v-model="payType">
          <el-radio label="WECHAT">微信支付</el-radio>
          <el-radio label="ALIPAY">支付宝支付</el-radio>
          <el-radio label="CASH">现金支付</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <div slot="footer" class="dialog-footer">
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="submit">确定收款</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'NoGoodsPayDialog',
  props: {
    showDialog: { type: Boolean, default: false }
  },
  data() {
    return {
      amount: '',
      remark: '',
      payType: 'CASH'
    }
  },
  computed: {
    visible: {
      get() {
        return this.showDialog
      },
      set(v) {
        if (!v) this.$emit('closeDialog')
      }
    }
  },
  watch: {
    showDialog(v) {
      if (v) {
        this.amount = ''
        this.remark = ''
        this.payType = 'CASH'
      }
    }
  },
  methods: {
    submit() {
      const amount = Number(this.amount)
      if (!amount || amount <= 0) {
        this.$message.warning('请输入正确的收款金额')
        return
      }
      this.$emit('submit', {
        amount: Number(amount.toFixed(2)),
        remark: this.remark,
        payType: this.payType
      })
    }
  }
}
</script>

<style scoped>
.unit {
  margin-left: 8px;
  color: #909399;
  font-size: 13px;
}
</style>
