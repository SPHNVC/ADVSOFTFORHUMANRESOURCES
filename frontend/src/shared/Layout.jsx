import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

function Layout() {
  return (
    <>
      <Navbar />
      <main style={{ padding: '1.5rem' }}>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
