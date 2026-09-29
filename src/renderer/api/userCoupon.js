import request from '@/utils/request'

// 会员已领取卡券列表
export function getUserCouponList(query) {
  return request({
    url: 'backendApi/userCoupon/list',
    method: 'get',
    params: query
  })
}

// 删除会员卡券
export function deleteUserCoupon(id) {
  return request({
    url: 'backendApi/userCoupon/delete/' + id,
    method: 'get'
  })
}
