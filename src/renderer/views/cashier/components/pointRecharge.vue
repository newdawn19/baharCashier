<template>
  <el-dialog
    title="积分充值"
    :visible.sync="visible"
    width="420px"
    append-to-body
    @close="onClose"
  >
    <el-form ref="form" :model="form" :rules="rules" label-width="88px" size="small">
      <el-form-item label="充值积分" prop="point">
        <el-input-number
          v-model="form.point"
          :min="0"
          :step="10"
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
import request from '@/utils/request'
import { Message } from 'element-ui'

export default {
  name: 'PointRecharge',
  props: {
    showDialog: { type: Boolean, default: false },
    userId: { type: [Number, String], default: 0 }
  },
  data() {
    return {
      visible: false,
      loading: false,
      form: { point: 0, remark: '' },
      rules: {
        point: [{ required: true, message: '请输入充值积分', trigger: 'blur' }]
      }
    }
  },
  watch: {
    showDialog(val) {
      this.visible = val
      if (val) {
        this.form = { point: 0, remark: '' }
      }
    }
  },
  methods: {
    onClose() {
      this.visible = false
      this.$emit('closeDialog', 'openPoint')
      this.$emit('close')
    },
    onSubmit() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        this.loading = true
        request({
          url: 'backendApi/point/doRecharge',
          method: 'post',
          data: {
            userId: this.userId,
            point: this.form.point,
            remark: this.form.remark
          }
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
