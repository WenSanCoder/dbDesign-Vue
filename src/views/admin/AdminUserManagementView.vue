<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">查询用户资料，维护账号和自定义角色权限。</p>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="用户列表" name="users">
        <section class="plain-panel">
          <div class="filter-row user-filter-row">
            <el-input v-model="filters.keyword" clearable placeholder="账号或姓名" style="width:220px" @keyup.enter="searchUsers" />
            <el-select v-model="filters.roleId" clearable placeholder="角色身份" style="width:170px">
              <el-option v-for="role in rbac.roles" :key="role.role_id" :label="role.role_name" :value="role.role_id" />
            </el-select>
            <el-select v-model="filters.status" clearable placeholder="账号状态" style="width:130px">
              <el-option label="启用" value="enabled" /><el-option label="停用" value="disabled" />
            </el-select>
            <el-button type="primary" @click="searchUsers">查询</el-button>
            <el-button @click="resetUsers">重置</el-button>
            <span class="filter-spacer" />
            <AdminXlsxImportButton import-type="users" :operator-user-id="session.user?.user_id" @imported="loadAll" />
            <el-button type="primary" :icon="Plus" @click="openCreateUser">新建用户</el-button>
          </div>
        </section>

        <section class="plain-panel">
          <el-table :data="users" border v-loading="loading">
            <el-table-column prop="username" label="账号" min-width="150" />
            <el-table-column prop="display_name" label="姓名" min-width="120" />
            <el-table-column label="身份" min-width="140">
              <template #default="{ row }"><el-tag :type="row.is_system_role ? 'info' : 'primary'">{{ row.role_name || row.role_code }}</el-tag></template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><el-tag :type="row.status === 'enabled' ? 'success' : 'info'">{{ accountStatusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="last_login_at" label="最近登录" width="180" />
            <el-table-column label="操作" width="230" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="View" @click="showDetail(row)">查看</el-button>
                <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
                <el-button link type="danger" :icon="Delete" @click="deleteUser(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-row">
            <el-pagination v-model:current-page="userPage" v-model:page-size="userPageSize" :total="userTotal" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" @current-change="loadUsers" @size-change="onUserSizeChange" />
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="角色权限" name="roles">
        <div class="role-toolbar">
          <el-button type="primary" :icon="Plus" @click="openRoleDialog()">新建角色</el-button>
          <span>管理员、教师、学生为内置角色，不可修改；自定义角色可随时调整。</span>
        </div>
        <section class="plain-panel">
          <el-table :data="rbac.roles" border>
            <el-table-column prop="role_code" label="角色代码" min-width="150" />
            <el-table-column prop="role_name" label="角色名称" min-width="150" />
            <el-table-column prop="description" label="说明" min-width="240" />
            <el-table-column label="类型" width="100"><template #default="{ row }"><el-tag :type="row.is_system ? 'info' : 'success'">{{ row.is_system ? '系统内置' : '自定义' }}</el-tag></template></el-table-column>
            <el-table-column label="已授权功能" width="120"><template #default="{ row }">{{ rolePermissionCount(row.role_id) }} 项</template></el-table-column>
            <el-table-column label="操作" width="100"><template #default="{ row }"><el-button link type="primary" :disabled="row.is_system" @click="openRoleDialog(row)">编辑权限</el-button></template></el-table-column>
          </el-table>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-model="detailVisible" title="用户详情" size="600px">
      <template v-if="detail">
        <h3 class="detail-heading">账号信息</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="账号">{{ detail.username }}</el-descriptions-item>
          <el-descriptions-item label="密码">已设置（不可查看，可在编辑中重置）</el-descriptions-item>
          <el-descriptions-item label="姓名">{{ detail.display_name }}</el-descriptions-item>
          <el-descriptions-item label="角色身份">{{ detail.role_name || detail.role_code }}</el-descriptions-item>
          <el-descriptions-item label="账号状态">{{ accountStatusLabel(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="最近登录">{{ detail.last_login_at || '从未登录' }}</el-descriptions-item>
          <el-descriptions-item label="密码修改时间">{{ detail.password_changed_at || '尚未记录' }}</el-descriptions-item>
          <el-descriptions-item label="首次登录须改密">{{ detail.must_change_password == null ? '尚未启用安全状态' : detail.must_change_password ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="登录失败次数">{{ detail.failed_login_count ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="锁定截止时间">{{ detail.locked_until || '未锁定' }}</el-descriptions-item>
        </el-descriptions>
        <template v-if="Object.keys(detail.identity || {}).length">
          <h3 class="detail-heading identity-heading">身份资料</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item v-for="(value,key) in detail.identity" :key="key" :label="detailLabel(String(key))">{{ displayDetailValue(String(key), value) }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </template>
    </el-drawer>

    <el-dialog v-model="userDialog" title="新建用户" width="560px">
      <el-form label-width="100px">
        <el-form-item label="账号" required><el-input v-model="userForm.username" /></el-form-item>
        <el-form-item label="初始密码" required><el-input v-model="userForm.password" type="password" show-password /></el-form-item>
        <el-form-item label="显示姓名" required><el-input v-model="userForm.displayName" /></el-form-item>
        <el-form-item label="角色身份" required>
          <el-select v-model="userForm.roleId" style="width:100%" @change="userForm.relatedId=undefined">
            <el-option v-for="role in rbac.roles" :key="role.role_id" :label="role.role_name" :value="role.role_id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="newUserNeedsIdentity" label="关联身份" required>
          <el-select v-model="userForm.relatedId" filterable style="width:100%">
            <el-option v-for="item in newUserIdentityOptions" :key="item.id" :label="item.label" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="userDialog=false">取消</el-button><el-button type="primary" @click="createUser">创建</el-button></template>
    </el-dialog>

    <el-dialog v-model="editDialog" title="编辑用户信息" width="760px" destroy-on-close>
      <el-form label-width="105px" class="edit-form">
        <el-divider content-position="left">账号信息</el-divider>
        <div class="form-grid">
          <el-form-item label="账号" required><el-input v-model="editForm.username" /></el-form-item>
          <el-form-item label="姓名" required><el-input v-model="editForm.displayName" /></el-form-item>
          <el-form-item label="角色身份" required>
            <el-select v-model="editForm.roleId" style="width:100%" @change="onEditRoleChange"><el-option v-for="role in rbac.roles" :key="role.role_id" :label="role.role_name" :value="role.role_id" /></el-select>
          </el-form-item>
          <el-form-item label="账号状态" required>
            <el-select v-model="editForm.status" style="width:100%"><el-option label="启用" value="enabled" /><el-option label="停用" value="disabled" /></el-select>
          </el-form-item>
          <el-form-item label="重置密码"><el-input v-model="editForm.password" type="password" show-password placeholder="留空则不修改" /></el-form-item>
          <el-form-item v-if="editNeedsIdentity" label="关联身份" required>
            <el-select v-model="editForm.relatedId" filterable style="width:100%" @change="loadSelectedIdentity">
              <el-option v-for="item in editIdentityOptions" :key="item.id" :label="item.label" :value="item.id" />
            </el-select>
          </el-form-item>
        </div>

        <template v-if="editRoleCode === 'STUDENT'">
          <el-divider content-position="left">学生资料</el-divider>
          <div class="form-grid">
            <el-form-item label="学号" required><el-input v-model="editForm.identity.number" /></el-form-item>
            <el-form-item label="性别" required><el-select v-model="editForm.identity.gender" style="width:100%"><el-option label="男" value="男" /><el-option label="女" value="女" /></el-select></el-form-item>
            <el-form-item label="年龄"><el-input-number v-model="editForm.identity.age" :min="15" :max="60" style="width:100%" /></el-form-item>
            <el-form-item label="电话"><el-input v-model="editForm.identity.phone" maxlength="30" /></el-form-item>
            <el-form-item label="学院" required><el-select v-model="editForm.identity.collegeId" filterable style="width:100%" @change="onStudentCollegeChange"><el-option v-for="item in lookups.colleges" :key="item.college_id" :label="item.college_name" :value="item.college_id" /></el-select></el-form-item>
            <el-form-item label="专业" required><el-select v-model="editForm.identity.majorId" filterable style="width:100%" @change="editForm.identity.adminClassId=undefined"><el-option v-for="item in editMajors" :key="item.major_id" :label="item.major_name" :value="item.major_id" /></el-select></el-form-item>
            <el-form-item label="入学年级" required><el-select v-model="editForm.identity.gradeYear" style="width:100%" @change="editForm.identity.adminClassId=undefined"><el-option v-for="item in lookups.gradeYears" :key="item.grade_year" :label="`${item.grade_year}级`" :value="item.grade_year" /></el-select></el-form-item>
            <el-form-item label="行政班" required><el-select v-model="editForm.identity.adminClassId" filterable style="width:100%"><el-option v-for="item in editAdminClasses" :key="item.admin_class_id" :label="item.class_name" :value="item.admin_class_id" /></el-select></el-form-item>
            <el-form-item label="学籍状态" required><el-select v-model="editForm.identity.identityStatus" style="width:100%"><el-option label="在读" value="active" /><el-option label="休学" value="suspended" /><el-option label="已毕业" value="graduated" /></el-select></el-form-item>
            <el-form-item label="生源地"><el-select v-model="editForm.identity.regionName" clearable filterable allow-create default-first-option style="width:100%" placeholder="选择或输入生源地"><el-option v-for="item in lookups.regions" :key="item.region_id" :label="item.region_name" :value="item.region_name" /></el-select></el-form-item>
          </div>
        </template>

        <template v-if="editRoleCode === 'TEACHER'">
          <el-divider content-position="left">教师资料</el-divider>
          <div class="form-grid">
            <el-form-item label="工号" required><el-input v-model="editForm.identity.number" /></el-form-item>
            <el-form-item label="性别" required><el-select v-model="editForm.identity.gender" style="width:100%"><el-option label="男" value="男" /><el-option label="女" value="女" /></el-select></el-form-item>
            <el-form-item label="年龄"><el-input-number v-model="editForm.identity.age" :min="20" :max="80" style="width:100%" /></el-form-item>
            <el-form-item label="电话"><el-input v-model="editForm.identity.phone" maxlength="30" /></el-form-item>
            <el-form-item label="职称"><el-input v-model="editForm.identity.title" /></el-form-item>
            <el-form-item label="学院" required><el-select v-model="editForm.identity.collegeId" filterable style="width:100%"><el-option v-for="item in lookups.colleges" :key="item.college_id" :label="item.college_name" :value="item.college_id" /></el-select></el-form-item>
            <el-form-item label="教师状态" required><el-select v-model="editForm.identity.identityStatus" style="width:100%"><el-option label="在职" value="active" /><el-option label="离职" value="inactive" /></el-select></el-form-item>
          </div>
        </template>
      </el-form>
      <template #footer><el-button @click="editDialog=false">取消</el-button><el-button type="primary" :loading="editSaving" @click="saveUser">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="roleDialog" :title="editingRoleId ? '编辑自定义角色' : '新建自定义角色'" width="680px">
      <el-form label-width="100px">
        <el-form-item label="角色代码" required><el-input v-model="roleForm.roleCode" maxlength="20" :disabled="!!editingRoleId" placeholder="例如 COUNSELOR" /></el-form-item>
        <el-form-item label="角色名称" required><el-input v-model="roleForm.roleName" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="roleForm.description" /></el-form-item>
        <el-form-item label="功能权限"><el-tree ref="permissionTree" :data="permissionTreeData" node-key="id" show-checkbox check-strictly default-expand-all :props="{ label:'label', children:'children' }" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="roleDialog=false">取消</el-button><el-button type="primary" @click="saveRole">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, View } from '@element-plus/icons-vue'
import { apiDelete, apiGet, apiPost, apiPut } from '../../api/http'
import { useSessionStore } from '../../stores/session'
import AdminXlsxImportButton from '../../components/admin/AdminXlsxImportButton.vue'

const session = useSessionStore()
const activeTab = ref('users')
const loading = ref(false)
const users = ref<any[]>([])
const userPage = ref(1)
const userPageSize = ref(20)
const userTotal = ref(0)
const filters = reactive<any>({ keyword: '', roleId: undefined, status: '' })
const rbac = reactive<any>({ roles: [], permissions: [], rolePermissions: [] })
const lookups = reactive<any>({ roles: [], colleges: [], majors: [], gradeYears: [], adminClasses: [], regions: [], students: [], teachers: [] })
const detailVisible = ref(false)
const detail = ref<any>(null)
const userDialog = ref(false)
const userForm = reactive<any>({ username: '', password: '123456', displayName: '', relatedId: undefined, roleId: undefined })
const editDialog = ref(false)
const editSaving = ref(false)
const editForm = reactive<any>({ userId: undefined, username: '', displayName: '', password: '', status: 'enabled', roleId: undefined, relatedId: undefined, identity: {} })
const roleDialog = ref(false)
const editingRoleId = ref<number>()
const permissionTree = ref<any>()
const roleForm = reactive<any>({ roleCode: '', roleName: '', description: '', status: 'enabled' })
const menuGroups = [['admin.menu.info','信息维护'],['admin.menu.resources','教学资源'],['admin.menu.approvals','审批中心'],['admin.menu.selection','选课管理'],['admin.menu.grade-query','成绩查询']]

const permissionTreeData = computed(() => menuGroups.map(([code,label]) => {
  const parent = rbac.permissions.find((item:any) => item.permission_code === code)
  const prefix = code === 'admin.menu.info' ? 'admin.info.' : code === 'admin.menu.resources' ? 'admin.resources.' : code === 'admin.menu.approvals' ? 'admin.approvals.' : code === 'admin.menu.selection' ? 'admin.selection.' : ''
  return { id: parent?.permission_id, label, children: prefix ? rbac.permissions.filter((item:any) => item.permission_code.startsWith(prefix)).map((item:any) => ({ id:item.permission_id, label:item.permission_name })) : [] }
}).filter((item:any) => item.id))
const newUserRole = computed(() => rbac.roles.find((role:any) => role.role_id === userForm.roleId))
const newUserNeedsIdentity = computed(() => isRelatedRole(newUserRole.value?.role_code))
const newUserIdentityOptions = computed(() => newUserRole.value?.role_code === 'STUDENT'
  ? lookups.students.map((item:any) => ({ id:item.student_id, label:`${item.student_no} ${item.student_name}` }))
  : lookups.teachers.map((item:any) => ({ id:item.teacher_id, label:`${item.teacher_no} ${item.teacher_name}` })))
const editRole = computed(() => rbac.roles.find((role:any) => role.role_id === editForm.roleId))
const editRoleCode = computed(() => editRole.value?.role_code || '')
const editNeedsIdentity = computed(() => isRelatedRole(editRoleCode.value))
const editIdentityOptions = computed(() => editRoleCode.value === 'STUDENT'
  ? lookups.students.map((item:any) => ({ id:item.student_id, label:`${item.student_no} ${item.student_name}` }))
  : lookups.teachers.map((item:any) => ({ id:item.teacher_id, label:`${item.teacher_no} ${item.teacher_name}` })))
const editMajors = computed(() => lookups.majors.filter((item:any) => !editForm.identity.collegeId || item.college_id === editForm.identity.collegeId))
const editAdminClasses = computed(() => lookups.adminClasses.filter((item:any) =>
  (!editForm.identity.collegeId || item.college_id === editForm.identity.collegeId)
  && (!editForm.identity.majorId || item.major_id === editForm.identity.majorId)
  && (!editForm.identity.gradeYear || item.grade_year === editForm.identity.gradeYear)))

onMounted(loadAll)

async function loadAll() {
  loading.value = true
  try {
    const [roleData, lookupData] = await Promise.all([apiGet<any>('/governance/rbac'), apiGet<any>('/admin/user-management/lookups')])
    Object.assign(rbac, roleData); Object.assign(lookups, lookupData)
    await loadUsers()
  } catch (error) { ElMessage.error((error as Error).message) }
  finally { loading.value = false }
}

async function loadUsers() {
  const result = await apiGet<any>('/admin/user-management/users', { ...filters, page:userPage.value, pageSize:userPageSize.value })
  users.value = result.records || []; userTotal.value = Number(result.total || 0)
}
async function searchUsers() { userPage.value = 1; await loadUsers() }
async function resetUsers() { Object.assign(filters, { keyword:'', roleId:undefined, status:'' }); await searchUsers() }
async function onUserSizeChange() { userPage.value = 1; await loadUsers() }

async function showDetail(row:any) {
  try { detail.value = await apiGet(`/admin/user-management/users/${row.user_id}`); detailVisible.value = true }
  catch (error) { ElMessage.error((error as Error).message) }
}

function openCreateUser() {
  Object.assign(userForm, { username:'', password:'123456', displayName:'', relatedId:undefined, roleId:undefined }); userDialog.value = true
}
async function createUser() {
  try { await apiPost('/admin/user-management/users', { ...userForm, assignedBy:session.user?.user_id }); userDialog.value = false; await loadAll(); ElMessage.success('用户已创建') }
  catch (error) { ElMessage.error((error as Error).message) }
}

async function openEdit(row:any) {
  try {
    const data = await apiGet<any>(`/admin/user-management/users/${row.user_id}`)
    Object.assign(editForm, { userId:data.user_id, username:data.username, displayName:data.display_name, password:'', status:data.status, roleId:data.role_id, relatedId:data.related_id, identity:identityForm(data.role_code, data.identity || {}) })
    editDialog.value = true
  } catch (error) { ElMessage.error((error as Error).message) }
}

function identityForm(roleCode:string, data:any) {
  if (roleCode === 'STUDENT') return { number:data.student_no, gender:data.gender, age:data.age, phone:data.phone, gradeYear:data.grade_year, adminClassId:data.admin_class_id, regionId:data.region_id, regionName:data.region_name, identityStatus:data.identity_status, majorId:data.major_id, collegeId:data.college_id }
  if (roleCode === 'TEACHER') return { number:data.teacher_no, gender:data.gender, age:data.age, phone:data.phone, title:data.title, collegeId:data.college_id, identityStatus:data.identity_status }
  return {}
}

function onEditRoleChange() {
  editForm.relatedId = undefined; editForm.identity = {}; editForm.password = ''
}

async function loadSelectedIdentity() {
  if (!editForm.relatedId || !editNeedsIdentity.value) return
  try {
    const resource = editRoleCode.value === 'STUDENT' ? 'students' : 'teachers'
    const data = await apiGet<any>(`/admin/${resource}/${editForm.relatedId}`)
    const adminClass = editRoleCode.value === 'STUDENT'
      ? lookups.adminClasses.find((item:any) => item.admin_class_id === data.admin_class_id)
      : undefined
    editForm.displayName = editRoleCode.value === 'STUDENT' ? data.student_name : data.teacher_name
    editForm.identity = identityForm(editRoleCode.value, {
      ...data,
      identity_status:data.status,
      major_id:adminClass?.major_id,
      college_id:adminClass?.college_id,
      region_name:lookups.regions.find((item:any) => item.region_id === data.region_id)?.region_name
    })
  } catch (error) { ElMessage.error((error as Error).message) }
}

async function saveUser() {
  editSaving.value = true
  try {
    await apiPut(`/admin/user-management/users/${editForm.userId}`, { ...editForm, assignedBy:session.user?.user_id })
    editDialog.value = false; await loadUsers(); ElMessage.success('用户信息已更新')
  } catch (error) { ElMessage.error((error as Error).message) }
  finally { editSaving.value = false }
}

async function deleteUser(row:any) {
  try {
    await ElMessageBox.confirm(`确认删除用户“${row.username}”？学生或教师档案会保留。`, '删除用户', { type:'warning' })
    await apiDelete(`/admin/user-management/users/${row.user_id}?operatorUserId=${session.user?.user_id}`)
    await loadUsers(); ElMessage.success('用户已删除')
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error((error as Error).message) }
}

function onStudentCollegeChange() { editForm.identity.majorId = undefined; editForm.identity.adminClassId = undefined }

function openRoleDialog(role?:any) {
  editingRoleId.value = role?.role_id
  Object.assign(roleForm, { roleCode:role?.role_code || '', roleName:role?.role_name || '', description:role?.description || '', status:role?.status || 'enabled' })
  roleDialog.value = true
  nextTick(() => permissionTree.value?.setCheckedKeys(role ? rbac.rolePermissions.filter((item:any) => item.role_id === role.role_id).map((item:any) => item.permission_id) : []))
}
async function saveRole() {
  try {
    const checked = new Set<number>(permissionTree.value?.getCheckedKeys() || [])
    for (const group of permissionTreeData.value) if (group.children.some((child:any) => checked.has(child.id))) checked.add(group.id)
    const body = { ...roleForm, systemRole:false, scopeTypesText:'[]', permissionIds:[...checked] }
    if (editingRoleId.value) await apiPut(`/governance/rbac/roles/${editingRoleId.value}`, body); else await apiPost('/governance/rbac/roles', body)
    roleDialog.value = false; await loadAll(); ElMessage.success('角色权限已保存')
  } catch (error) { ElMessage.error((error as Error).message) }
}

function rolePermissionCount(id:number) {
  return rbac.rolePermissions.filter((item:any) => item.role_id === id && rbac.permissions.some((permission:any) =>
    permission.permission_id === item.permission_id
      && (permission.permission_code.includes('.menu.') || permission.permission_code.startsWith('admin.'))
  )).length
}
function isRelatedRole(code:string) { return code === 'TEACHER' || code === 'STUDENT' }
function accountStatusLabel(value:string) { return ({ enabled:'启用', disabled:'停用' } as Record<string,string>)[value] || value || '-' }
function identityStatusLabel(value:string) { return ({ active:'正常/在读', suspended:'休学', graduated:'已毕业', inactive:'离职' } as Record<string,string>)[value] || value || '-' }
function genderLabel(value:string) { return ({ male:'男', female:'女', '男':'男', '女':'女' } as Record<string,string>)[value] || value || '-' }
function displayDetailValue(key:string, value:any) { if (value == null || value === '') return '-'; if (key === 'identity_status') return identityStatusLabel(String(value)); if (key === 'gender') return genderLabel(String(value)); return value }
function detailLabel(key:string) {
  const labels:Record<string,string> = { student_id:'学生ID', student_no:'学号', student_name:'学生姓名', teacher_id:'教师ID', teacher_no:'工号', teacher_name:'教师姓名', gender:'性别', age:'年龄', phone:'电话', grade_year:'入学年级', admin_class_id:'行政班ID', region_id:'生源地ID', total_credits:'总学分', identity_status:'学籍/在职状态', class_name:'行政班', major_id:'专业ID', major_name:'专业', college_id:'学院ID', college_name:'学院', region_name:'生源地', title:'职称' }
  return labels[key] || key
}
</script>

<style scoped>
.page-head { display:flex; justify-content:space-between; align-items:flex-start; }
.page-subtitle { margin:4px 0 0; color:#64748b; font-size:14px; }
.user-filter-row { flex-wrap:wrap; }
.filter-spacer { flex:1; }
.pagination-row { display:flex; justify-content:flex-end; margin-top:14px; }
.role-toolbar { display:flex; align-items:center; gap:14px; margin-bottom:12px; color:#64748b; font-size:13px; }
.detail-heading { margin:0 0 12px; color:#334155; font-size:16px; }
.identity-heading { margin-top:22px; }
.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:18px; }
@media(max-width:760px) { .form-grid { grid-template-columns:1fr; } }
</style>
