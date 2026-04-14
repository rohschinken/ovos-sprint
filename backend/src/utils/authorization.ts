import { db } from '../db/index.js'

/**
 * Check if a user can modify a project (admin or project manager/owner).
 * Returns true if the user is an admin, or if the user is the project's manager.
 */
export async function canModifyProject(userId: number, userRole: string, projectId: number): Promise<boolean> {
  if (userRole === 'admin') return true

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  })

  return project?.managerId === userId
}
