<template>
  <el-dialog
    title="余额充值"
    :visible.sync="visible"
    width="420px"
    append-to-body
    @close="onClose"
  >
    <el-form ref="form" :model="form" :rules="rules" label-width="88px" size="small">
      <el-form-item label="充值金额" prop="amount">
        <el-input-number
          v-model="form.amount"
          :min="0"
          :precision="2"
          :step="10"
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item label="赠送金额" prop="giftAmount">
        <el-input-number
          v-model="form.giftAmount"
          :min="0"
          :precision="2"
          :step="1"
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button size="small" @click="onClose">取 消</el-button>
      <el-button size="small" type="primary" :loading="loading" @click="onSubmit">确认充值</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { doRecharge } from '@/api/balance'
import { Message } from 'element-ui'

export default {
  name: 'BalanceRecharge',
  props: {
    showDialog: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 0 }
  },
  data() {
    return {
      visible: false,
      loading: false,
      form: { amount: 0, giftAmount: 0, remark: '' },
      rules: {
        amount: [{ required: true, message: '请输入充值金额', trigger: 'blur' }]
      }
    }
  },
  watch: {
    showDialog(val) {
      this.visible = val
      if (val) {
        this.form = { amount: 0, giftAmount: 0, remark: '' }
      }
    }
  },
  methods: {
    onClose() {
      this.visible = false
      this.$emit('closeDialog', 'openBalance')
      this.$emit('close')
    },
    onSubmit() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.loading = true
        doRecharge({
          userId: this.userId,
          amount: this.form.amount,
          giftAmount: this.form.giftAmount,
          remark: this.form.remark
        }).then(() => {
          this.loading = false
          Message.success('充值成功')
          this.onClose()
        }).catch(() => {
          this.loading = false
        })
      })
    }
  }
}
</script>
