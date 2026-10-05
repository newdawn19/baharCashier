<template>
  <!--
    挂单列表：原来收银主页只能「挂单」不能「取单」（showHangUpList 只弹一条 message）。
    竞品实测为 1000×969 的 20 宫格：空位可挂单，已占用位可取单。
  -->
  <el-dialog
    title="挂单列表"
    :visible.sync="visible"
    width="1000px"
    top="5vh"
    :close-on-click-modal="false"
    append-to-body
    @closed="$emit('closeDialog')"
  >
    <div class="hang-tip">提示：请选择一个空白位置挂单</div>

    <div class="hang-grid">
      <div
        v-for="slot in slots"
        :key="slot.no"
        class="hang-cell"
        :class="slot.data ? 'is-used' : 'is-empty'"
        @click="onCellClick(slot)"
      >
        <div class="cell-no">#{{ slot.no }}</div>
        <template v-if="slot.data">
          <div class="cell-line">会员：{{ (slot.data.userName) || '游客' }}</div>
          <div class="cell-line">件数：{{ slot.data.num || 0 }}</div>
          <div class="cell-line">金额：￥{{ Number(slot.data.amount || 0).toFixed(2) }}</div>
          <div class="cell-time">{{ slot.data.createTime || '' }}</div>
        </template>
        <template v-else>
          <div class="cell-empty-text">空白位置</div>
        </template>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="visible = false">关闭</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { getHangUpList } from '@/api/cashier'

export default {
  name: 'HangUpList',
  props: {
    showDialog: { type: Boolean, default: false }
  },
  data() {
    return {
      // 竞品是 20 个挂单位
      slotCount: 20,
      list: []
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
    },
    slots() {
      const arr = []
      for (let i = 1; i <= this.slotCount; i++) {
        const no = i < 10 ? '0' + i : String(i)
        // 后端返回的挂单可能带 position/no 字段，匹配不到就按数组顺序落位
        const data = this.list.find(
          item => String(item.position || item.no || item.id) === no
        )
        arr.push({ no: no, data: data })
      }
      if (!this.list.some(i => i.position || i.no)) {
        // 后端没给位置字段时，按返回顺序依次占用前 N 个格子
        for (let k = 0; k < this.list.length && k < arr.length; k++) {
          arr[k].data = this.list[k]
        }
      }
      return arr
    }
  },
  watch: {
    showDialog(v) {
      if (v) this.load()
    }
  },
  methods: {
    load() {
      getHangUpList().then(res => {
        const d = res.data
        const list = Array.isArray(d) ? d : ((d && (d.list || d.records)) || [])
        this.list = list
      }).catch(() => {
        this.list = []
      })
    },
    onCellClick(slot) {
      if (slot.data) {
        this.$emit('takeUp', slot.data)
      } else {
        this.$emit('hangUp', slot)
      }
    }
  }
}
</script>

<style scoped>
.hang-tip {
  color: #909399;
  font-size: 13px;
  margin-bottom: 10px;
}

.hang-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.hang-cell {
  height: 150px;
  border-radius: 5px;
  padding: 10px;
  box-sizing: border-box;
  cursor: pointer;
  font-size: 12px;
  line-height: 20px;
  overflow: hidden;
}

.is-empty {
  border: 1px dashed #C0C4CC;
  color: #C0C4CC;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.is-empty:hover {
  border-color: #00ACAC;
  color: #00ACAC;
}

.is-used {
  border: 1px solid #00ACAC;
  background: #F0F8FF;
  color: #606266;
}

.is-used:hover {
  box-shadow: 0 2px 8px rgba(0, 172, 172, .3);
}

.cell-no {
  font-size: 14px;
  font-weight: 700;
  color: #00ACAC;
  margin-bottom: 4px;
}

.cell-empty-text {
  font-size: 14px;
}

.cell-time {
  margin-top: 4px;
  color: #909399;
  font-size: 11px;
}
</style>
