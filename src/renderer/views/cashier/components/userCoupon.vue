<template>
  <div class="userCoupon-container">
    <el-form :model="queryParams" class="search-form" ref="queryForm" size="small" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="ID" prop="id">
        <el-input
          v-model="queryParams.id"
          placeholder="请输入ID"
          clearable
          style="width: 150px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="卡券ID" prop="couponId">
        <el-input
          v-model="queryParams.couponId"
          placeholder="请输入卡券ID"
          clearable
          style="width: 150px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="会员ID" prop="userId">
        <el-input
          v-model="queryParams.userId"
          placeholder="请输入会员ID"
          clearable
          style="width: 150px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="会员号" prop="userNo">
        <el-input
          v-model="queryParams.userNo"
          placeholder="请输入会员号"
          clearable
          style="width: 150px;"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="手机号" prop="mobile">
        <el-input
          v-model="queryParams.mobile"
          placeholder="请输入会员手机号"
          clearable
          style="width: 150px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="核销码" prop="code">
        <el-input
          v-model="queryParams.code"
          placeholder="请输入核销二维码"
          clearable
          style="width: 150px"
          @keyup.enter.native="handleQuery"
        />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-select
          v-model="queryParams.type"
          clearable
          placeholder="卡券类型"
        >
          <el-option v-for="typeInfo in typeList" :key="typeInfo.key" :label="typeInfo.name" :value="typeInfo.key"/>
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="状态"
          style="width: 150px"
          clearable
        >
          <el-option v-for="statusInfo in statusList" :key="statusInfo.key" :label="statusInfo.name" :value="statusInfo.key"/>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="main-button-middle" icon="el-icon-search" size="mini" @click="handleQuery(false)">搜索</el-button>
        <el-button icon="el-icon-refresh" class="main-button-middle main-button-reset" size="mini" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table ref="tables" v-loading="loading" :data="list" border style="width: 100%;" fit height="100%" @selection-change="handleSelectionChange" :default-sort="defaultSort" @sort-change="handleSortChange">
      <el-table-column label="ID" prop="id" width="100"/>
      <el-table-column label="核销码" prop="code" width="150"/>
      <el-table-column label="会员ID" align="center" prop="userInfo.id">
        <template slot-scope="scope">
          <span v-if="scope.row.userInfo">
              <span>{{ scope.row.userInfo.id }}</span>
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="会员号" align="center" width="130" prop="userInfo.userNo">
        <template slot-scope="scope">
          <span v-if="scope.row.userInfo && scope.row.userInfo.userNo">{{ scope.row.userInfo.userNo }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="手机号" align="center" width="120" prop="userInfo.mobile">
        <template slot-scope="scope">
          <span v-if="scope.row.userInfo">{{ scope.row.userInfo.mobile ? scope.row.userInfo.mobile : '-' }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="会员名称" align="center" prop="userInfo.name">
        <template slot-scope="scope">
          <span v-if="scope.row.userInfo">
              <span>{{ scope.row.userInfo.name }}</span>
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="卡券类型" align="center" prop="type">
        <template slot-scope="scope">
          <span v-if="scope.row.type">{{ getName(typeList, scope.row.type) }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="卡券名称" align="center" prop="name" width="120"/>
      <el-table-column label="所属店铺" align="center" prop="storeInfo" width="110">
        <template slot-scope="scope">
          <span v-if="scope.row.storeInfo">{{ scope.row.storeInfo.name }}</span>
          <span v-else>暂无</span>
        </template>
      </el-table-column>
      <el-table-column label="总面额 / 总次数" align="center" prop="amount" width="110">
         <template slot-scope="scope">
            <span v-if="scope.row.type != 'T'" style="color:red">
             <span v-if="scope.row.content == '2'">{{ (scope.row.amount / 10).toFixed(2) }}折</span>
             <span v-else>{{ scope.row.amount }}元</span>
           </span>
           <span v-else style="color:red"> {{ scope.row.amount }}次 </span>
         </template>
      </el-table-column>
      <el-table-column label="余额 / 核销次数" align="center" prop="balance" width="110">
        <template slot-scope="scope">
          <span v-if="scope.row.type != 'T'" style="color:forestgreen">
             <span v-if="scope.row.content == '2'">{{ (scope.row.amount / 10).toFixed(2) }}折</span>
             <span v-else>{{ scope.row.balance }}元</span>
          </span>
          <span v-else style="color:forestgreen"> {{ scope.row.balance }}次 </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template slot-scope="scope">
          <span v-if="scope.row.status">{{ getName(statusList, scope.row.status) }}</span>
          <span v-else>无</span>
        </template>
      </el-table-column>
      <el-table-column label="领取时间" align="center" width="160" prop="createTime">
        <template slot-scope="scope">
          <span v-if="scope.row.createTime">{{ parseTime(scope.row.createTime) }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" fixed='right' width="140">
        <template slot-scope="scope">
          <el-button
            size="mini"
            type="text"
            class="main-text"
            v-hasPermi="['cashier:index']"
            @click="handleDetail(scope.row)"
          >详情</el-button>
          <el-button
            :disabled="scope.row.status != 'A'"
            size="mini"
            type="text"
            class="main-text"
            v-hasPermi="['cashier:index']"
            @click="handleConfirm(scope.row)"
          >核销</el-button>
          <el-button
            size="mini"
            type="text"
            class="main-text"
            v-hasPermi="['cashier:index']"
            @click="handleDelete(scope.row)"
          >作废</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total>0"
      :total="total"
      class="pagination"
      :page.sync="queryParams.page"
      :limit.sync="queryParams.pageSize"
      @pagination="getList"
    />

    <!--详情对话框 start-->
    <el-dialog title="详情" :visible.sync="openDetail" class="common-dialog" width="700px" append-to-body>
      <el-form ref="detailForm" label-width="120px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="卡券类型：">
              <span class="coupon-type">[{{ getName(typeList, couponInfo.type) }}]</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="卡券名称：">
              <el-input style="width: 420px;" v-model="couponInfo.name" disabled maxlength="100" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="couponInfo.userInfo">
          <el-col :span="24">
            <el-form-item label="会员名称：">
              <el-input style="width: 420px;" v-model="couponInfo.userInfo.name" disabled></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="有效期：">
              <el-input style="width: 420px;" v-model="couponInfo.effectiveDate" disabled maxlength="100" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="couponInfo.amount">
          <el-col :span="24">
            <el-form-item label="卡券面额：">
              <el-input style="width: 200px;" v-model="couponInfo.amount.toFixed(2)" disabled></el-input>
              <span class="unit">元</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="couponInfo.type=='P'">
          <el-col :span="24">
            <el-form-item label="卡券余额：" prop="balance">
              <el-input v-model="couponInfo.balance.toFixed(2)" style="width: 200px;" disabled></el-input>
              <span class="unit">元</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row v-if="couponInfo.type=='T'">
          <el-col :span="24">
            <el-form-item label="核销次数：" prop="useRule">
              <span class="info">总共<b style="color:green;">{{ couponInfo.useRule }}</b>次，已核销<b style="color:red;"> {{ couponInfo.confirmCount }}</b>次</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="卡券说明：">
              <el-input v-model="couponInfo.description" type="textarea" rows="3" disabled></el-input>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-dialog>
    <!--详情对话框 end-->
  </div>
</template>

<script>
import { getUserCouponList, deleteUserCoupon } from "@/api/userCoupon";
import { getConfirmInfo } from "@/api/coupon";
import {Message} from "element-ui";
export default {
  name: "UserCouponIndex",
  data() {
    return {
      // 遮罩层
      loading: true,
      // 详情对话框
      openDetail: false,
      // 卡券详情
      couponInfo: {},
      // 显示搜索条件
      showSearch: true,
      // 总条数
      total: 0,
      // 表格数据
      list: [],
      // 卡券类型
      typeList: [],
      // 状态列表
      statusList: [],
      // 默认排序
      defaultSort: {prop: 'createTime', order: 'descending'},
      // 查询参数
      queryParams: {
        page: 1,
        pageSize: 10,
        mobile: '',
        userId: '',
        userNo: '',
        status: '',
        id: '',
        couponId: '',
        type: ''
      }
    };
  },
  created() {
    this.getList();
  },
  methods: {
    // 查询列表
    getList() {
      this.loading = true;
      getUserCouponList(this.queryParams).then(response => {
          this.list = response.data.paginationResponse.content;
          this.total = response.data.paginationResponse.totalElements;
          this.typeList = response.data.typeList;
          this.statusList = response.data.statusList;
          this.loading = false;
        }
      );
    },
    // 搜索按钮操作
    handleQuery() {
      this.queryParams.page = 1;
      this.getList();
    },
    // 重置按钮操作
    resetQuery() {
      this.dateRange = [];
      this.resetForm("queryForm");
      this.$refs.tables.sort(this.defaultSort.prop, this.defaultSort.order)
      this.handleQuery();
    },
    // 多选框选中数据
    handleSelectionChange(selection) {
      this.ids = selection.map(item => item.id)
      this.multiple = !selection.length
    },
    // 排序触发事件
    handleSortChange(column, prop, order) {
      this.queryParams.orderByColumn = column.prop;
      this.queryParams.isAsc = column.order;
      this.getList();
    },
    // 删除按钮操作
    handleDelete(row) {
      this.$confirm('是否确认作废ID等于' + row.id + '的数据项？').then(function() {
        return deleteUserCoupon(row.id);
      }).then(() => {
        this.getList();
        Message({
          message: "提示：作废成功",
          type: "success"
        });
      }).catch(() => {});
    },
    // 核销按钮操作
    handleConfirm(row) {
      this.$emit('doConfirmCoupon', row.code);
    },
    // 查看详情操作
    handleDetail(row) {
      const app = this;
      app.loading = true;
      getConfirmInfo({ id: row.id, code: row.code }).then(response => {
        app.couponInfo = response.data.couponInfo;
        app.couponInfo.userInfo = response.data.userInfo;
        app.openDetail = true;
        app.loading = false;
      });
    }
  }
};
</script>

<style lang="scss" scoped>
::v-deep .el-table__body-wrapper::-webkit-scrollbar {
  width: 12px;
  height: 12px;
  display: block;
}
::v-deep .el-table__body-wrapper::-webkit-scrollbar-thumb {
  background-color: #bfbfc0;
  border-radius: 5px;
}
::v-deep .el-table--scrollable-y .el-table__body-wrapper {
  overflow: overlay !important;
}
.userCoupon-container {
  position: absolute;
  top: 50px;
  left: 165px;
  right: 10px;
  height: 68%;
  .search-form {
    border: solid 1px #cccccc;
    margin-top: 0px;
    padding: 15px 10px 0px 10px;
    background: #f5f5f5;
    margin-bottom: 5px;
    border-radius: 3px;
  }
  .pagination {
    position: fixed;
    bottom: 10px;
    height: 50px;
    min-width: 800px;
    line-height: 50px;
    right: 170px;
    margin-top: 10px;
    display: block;
    background: #6c757d;
    color: #ffffff;
    border-radius: 5px;
    z-index: 99999;
  }
}
</style>
<style scoped>
::v-deep .el-pagination.is-background span {
  color: #fff;
}
</style>

