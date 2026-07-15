import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import HomeView from '../views/HomeView.vue'
import AdminResourceView from '../views/admin/AdminResourceView.vue'
import AdminSelectionMonitorView from '../views/admin/AdminSelectionMonitorView.vue'
import AdminRoomScheduleView from '../views/admin/AdminRoomScheduleView.vue'
import AdminSelectionRulesView from '../views/admin/AdminSelectionRulesView.vue'
import AdminApprovalView from '../views/admin/AdminApprovalView.vue'
import AdminUserManagementView from '../views/admin/AdminUserManagementView.vue'
import AdminGradeQueryView from '../views/admin/AdminGradeQueryView.vue'
import StudentCourseSelectionView from '../views/student/StudentCourseSelectionView.vue'
import StudentSelectionsView from '../views/student/StudentSelectionsView.vue'
import StudentScheduleView from '../views/student/StudentScheduleView.vue'
import StudentGradesView from '../views/student/StudentGradesView.vue'
import StudentTrainingPlanView from '../views/student/StudentTrainingPlanView.vue'
import StudentGovernanceView from '../views/student/StudentGovernanceView.vue'
import TeacherClassesView from '../views/teacher/TeacherClassesView.vue'
import TeacherGradesView from '../views/teacher/TeacherGradesView.vue'
import { useSessionStore } from '../stores/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/', component: HomeView },
    { path: '/admin/selection-monitor', component: AdminSelectionMonitorView, meta: { permission: 'admin.selection.monitor' } },
    { path: '/admin/room-schedules', component: AdminRoomScheduleView, meta: { permission: 'admin.info.room-schedules' } },
    { path: '/admin/selection-rules', component: AdminSelectionRulesView, meta: { permission: 'admin.resources.selection-rules' } },
    { path: '/admin/user-management', component: AdminUserManagementView, meta: { permission: 'admin.info.users' } },
    { path: '/admin/grade-query', component: AdminGradeQueryView, meta: { permission: 'admin.menu.grade-query' } },
    { path: '/admin/role-permissions', redirect: '/admin/user-management' },
    { path: '/admin/approvals/plan-adjustments', component: AdminApprovalView, props: { type: 'plan-adjustments' }, meta: { permission: 'admin.approvals.plan-adjustments' } },
    { path: '/admin/approvals/program-changes', component: AdminApprovalView, props: { type: 'program-changes' }, meta: { permission: 'admin.approvals.program-changes' } },
    { path: '/admin/approvals/grade-approvals', component: AdminApprovalView, props: { type: 'grade-approvals' }, meta: { permission: 'admin.approvals.grade-approvals' } },
    { path: '/admin/governance', redirect: '/admin/selection-rules' },
    { path: '/admin/:resource', component: AdminResourceView },
    { path: '/student/select', component: StudentCourseSelectionView, meta: { permission: 'student.selection.select' } },
    { path: '/student/selections', component: StudentSelectionsView, meta: { permission: 'student.selection.records' } },
    { path: '/student/schedule', component: StudentScheduleView, meta: { permission: 'student.schedule.mine' } },
    { path: '/student/grades', component: StudentGradesView, meta: { permission: 'student.info.grades' } },
    { path: '/student/training-plan', component: StudentTrainingPlanView, meta: { permission: 'student.info.training-plan' } },
    { path: '/student/governance', component: StudentGovernanceView, meta: { permission: 'student.info.governance' } },
    { path: '/teacher/classes', component: TeacherClassesView, meta: { permission: 'teacher.teaching.classes' } },
    { path: '/teacher/grades', component: TeacherGradesView, meta: { permission: 'teacher.grades.entry' } },
    { path: '/teacher/governance', redirect: '/teacher/classes' }
  ]
})

router.beforeEach((to) => {
  const session = useSessionStore()
  if (to.path !== '/login' && !session.user) return '/login'
  if (to.path === '/login' && session.user) return '/'
  const roleCode = session.user?.role_code
  const codes = session.user?.permission_codes || []
  const usesMenuPermissions = codes.some((code) => code.includes('.menu.'))
  const required = (to.meta.permission as string | undefined) || adminResourcePermission(to.params.resource as string | undefined)
  if (usesMenuPermissions && required && !codes.includes(required)) return '/'
  if (!usesMenuPermissions && roleCode !== 'ADMIN') {
    if (roleCode === 'TEACHER' && to.path.startsWith('/student/')) return '/'
    if (roleCode === 'STUDENT' && to.path.startsWith('/teacher/')) return '/'
    if (roleCode !== 'TEACHER' && roleCode !== 'STUDENT' && required) return '/'
  }
})

function adminResourcePermission(resource?: string) {
  if (!resource) return undefined
  const info = ['campuses', 'colleges', 'majors', 'terms', 'grade-years', 'buildings', 'classrooms', 'admin-classes', 'students', 'teachers', 'notices']
  if (info.includes(resource)) return `admin.info.${resource}`
  if (resource === 'courses' || resource === 'teaching-classes') return `admin.resources.${resource}`
  if (resource === 'rounds') return 'admin.selection.rounds'
  return undefined
}

export default router
