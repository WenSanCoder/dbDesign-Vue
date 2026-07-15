export interface CourseClassGroup<T extends Record<string, any> = Record<string, any>> {
  course_id: number
  course_code: string
  course_name: string
  credit: number | string
  hours: number | string
  classes: T[]
}

export function groupTeachingClasses<T extends Record<string, any>>(
  rows: T[],
  keyword = ''
): CourseClassGroup<T>[] {
  const normalizedKeyword = keyword.trim().toLowerCase()
  const groups = new Map<number, CourseClassGroup<T>>()

  rows.forEach((row) => {
    const courseId = Number(row.course_id)
    if (!groups.has(courseId)) {
      groups.set(courseId, {
        course_id: courseId,
        course_code: String(row.course_code || ''),
        course_name: String(row.course_name || ''),
        credit: row.credit,
        hours: row.hours,
        classes: []
      })
    }
    groups.get(courseId)!.classes.push(row)
  })

  return Array.from(groups.values())
    .filter((course) => !normalizedKeyword
      || course.course_code.toLowerCase().includes(normalizedKeyword)
      || course.course_name.toLowerCase().includes(normalizedKeyword))
    .sort((a, b) => a.course_code.localeCompare(b.course_code, 'zh-Hans-CN'))
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = Math.max(0, page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
