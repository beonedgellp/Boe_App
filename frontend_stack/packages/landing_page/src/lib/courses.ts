import { courses, type Course } from '../content/courses';

export type { Course } from '../content/courses';

export async function fetchCourses(): Promise<Course[]> {
  // In the future this can become a real API call.
  return Promise.resolve([...courses]);
}
