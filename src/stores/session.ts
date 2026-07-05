import { defineStore } from 'pinia'
import { cacheAvatar } from '../utils/avatar'

export type RoleCode = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface SessionUser {
  user_id: number
  username: string
  role_code: RoleCode
  display_name: string
  related_id: number | null
  avatar_path?: string | null
  token: string
}

const storageKey = 'edu-system-session'

export const useSessionStore = defineStore('session', {
  state: () => ({
    user: JSON.parse(localStorage.getItem(storageKey) || 'null') as SessionUser | null
  }),
  actions: {
    setUser(user: SessionUser) {
      this.user = user
      cacheAvatar(user.username, user.avatar_path)
      localStorage.setItem(storageKey, JSON.stringify(user))
    },
    updateAvatarPath(avatarPath: string) {
      if (!this.user) return
      this.user = { ...this.user, avatar_path: avatarPath }
      cacheAvatar(this.user.username, avatarPath)
      localStorage.setItem(storageKey, JSON.stringify(this.user))
    },
    logout() {
      this.user = null
      localStorage.removeItem(storageKey)
    }
  }
})
