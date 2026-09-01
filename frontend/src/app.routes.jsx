import { createBrowserRouter } from 'react-router-dom'
import Layout from './shared/Layout'
import Projects from './features/projects/Projects/Projects'
import Resources from './features/resources/Resources/Resources'
import EditResource from './features/resources/EditResource/EditResource'
import Assignments from './features/assignments/Assignments'
import Skills from './features/skills/Skills/Skills'
import CvTemplates from './features/cvTemplates/CvTemplates/CvTemplates'
import Reports from './features/reports/Reports/Reports'
import Availability from './features/availability/Availability/Availability'
import Login from './features/auth/Login/Login'
import RequireAuth from './shared/RequireAuth'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Projects /> },
      { path: 'projects', element: <Projects /> },
      { path: 'resources', element: <Resources /> },
      { path: 'resources/:id', element: <EditResource /> },
      { path: 'projects/:projectId/assignments', element: <Assignments /> },
      { path: 'skills', element: <Skills /> },
      { path: 'cv-templates', element: <CvTemplates /> },
      { path: 'reports', element: <Reports /> },
      { path: 'availability', element: <Availability /> },
    ],
  },
])

export default router
