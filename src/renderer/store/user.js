import { defineStore } from 'pinia'
import { resetRouter } from '@/router'
import { usePermissionStore } from './permission'
import { login, getInfo } from '@/api/login'

const TokenKey = 'Access-Token'
const store = () => {
    return {
        token: JSON.parse(localStorage.getItem(TokenKey)),
        name: JSON.parse(localStorage.getItem('name')),
        roles: JSON.parse(localStorage.getItem('roles'))
    }
}

export const useUserStore = defineStore({
    id: 'user',
    store,
    actions: {
        login(data) {
            return new Promise((resolve, reject) => {
                const { username } = data;
                const { password } = data;
                const { captchaCode } = data;
                const { uuid } = data;

                login(username, password, captchaCode, uuid).then(res => {
                    console.log('登录返回信息：', res.data);
                    localStorage.setItem(TokenKey, res.data.token);
                    this.token = res.data.token;
                    localStorage.setItem("roles", JSON.stringify(["admin"]));
                    localStorage.setItem("name", "Super Admin");
                    this.name = "Super Admin";
                    this.roles = ["admin"];

                    resolve()
                }).catch(error => {
                    reject(error);
                })
            })

        },
        logOut() {
            return new Promise((resolve, reject) => {
                const { ResetRoutes } = usePermissionStore()
                localStorage.setItem(TokenKey, "");
                localStorage.setItem("roles", JSON.stringify([]));
                localStorage.setItem("name", "");
                this.token = "";
                this.name = "";
                this.roles = [];
                ResetRoutes();
                resetRouter();
                resolve();
            })
        },
        GetUserInfo() {
            return new Promise((resolve, reject) => {
                getInfo().then(res => {
                    const user = res.data.accountInfo;
                    // 后端 getInfo 当前返回 roles: []（空数组）。
                    // 若直接用空数组覆盖登录时写入的 ["admin"]，会导致后续
                    // GenerateRoutes([]) 把 asyncRoutes 全部过滤掉（routers 恒为空），
                    // 守卫反复调用 GetUserInfo 形成死循环。因此这里做兜底：
                    // 后端未返回有效角色时，回退为已持有的角色；仍为空则回退 ['admin']。
                    const backendRoles = res.data.roles;
                    const fallbackRoles = (this.roles && this.roles.length) ? this.roles : ['admin'];
                    const finalRoles = (backendRoles && backendRoles.length) ? backendRoles : fallbackRoles;
                    localStorage.setItem("name", user.accountName);
                    localStorage.setItem("permissions", JSON.stringify(res.data.permissions));
                    localStorage.setItem("roles", JSON.stringify(finalRoles));
                    this.name = user.accountName;
                    this.roles = finalRoles;
                    resolve(this.roles);
                }).catch(error => {
                    reject(error)
                })
            })
        }
    }
})
