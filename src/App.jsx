import { useState, useEffect } from 'react'
import './App.css'
import Login, { getSession, clearSession } from './pages/Login'
import { signOutUser } from './services/db'
import Dashboard from './pages/Dashboard'
import Horses from './pages/Horses'
import Shows from './pages/Shows'
import Staff from './pages/Staff'
import Admin from './pages/Admin'
import Resources from './pages/Resources'
import RidingSchedule from './pages/RidingSchedule'
import ShoppingList from './pages/ShoppingList'
import ToFixList from './pages/ToFixList'


function App() {
  const [user,        setUser]        = useState(() => getSession())
  const parseHash = () => {
    if (typeof window === 'undefined') return { page: 'dashboard', subPage: null }
    const hash = window.location.hash.slice(1).replace(/^\/*/, '')
    if (!hash) return { page: 'dashboard', subPage: null }
    const [page, subPage] = hash.split('/', 2)
    const validPages = new Set(['dashboard', 'horses', 'shows', 'staff', 'admin', 'packinglist', 'ridingschedule', 'shoppinglist', 'tofixlist'])
    return {
      page: validPages.has(page) ? page : 'dashboard',
      subPage: page === 'packinglist' ? (subPage || null) : null,
    }
  }

  const initialHash = parseHash()
  const [currentPage, setCurrentPage] = useState(initialHash.page)
  const [largeText,   setLargeText]   = useState(() => localStorage.getItem('largeText') === 'true')
  const [resourcesSubPage, setResourcesSubPage] = useState(initialHash.subPage)

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText)
    localStorage.setItem('largeText', largeText)
  }, [largeText])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = currentPage === 'packinglist'
      ? `#${currentPage}${resourcesSubPage ? `/${resourcesSubPage}` : ''}`
      : `#${currentPage}`
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [currentPage, resourcesSubPage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleHashChange = () => {
      const { page, subPage } = parseHash()
      setCurrentPage(page)
      setResourcesSubPage(page === 'packinglist' ? subPage : null)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function handleLogin(u) {
    setUser(u)
    setCurrentPage('dashboard')
  }

  async function handleLogout() {
    await signOutUser()
    clearSession()
    setUser(null)
    setCurrentPage('dashboard')
  }

  if (!user) return <Login onLogin={handleLogin} />

  const allRoles = [user.role, ...(user.additionalRoles || [])]
  const hasRole  = r => allRoles.includes(r)

  const isAdmin        = hasRole('admin') || user.id === 'lillie.keenan@gmail.com'
  const canManageStaff = hasRole('admin') || hasRole('barn_manager')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard user={user} onNavigate={setCurrentPage} />
      case 'horses':    return <Horses user={user} />
      case 'shows':     return <Shows user={user} />
      case 'staff':     return canManageStaff ? <Staff user={user} /> : <Dashboard user={user} onNavigate={setCurrentPage} />
      case 'admin':       return isAdmin ? <Admin user={user} onNavigate={setCurrentPage} navigateToResource={page => { setResourcesSubPage(page); setCurrentPage('packinglist') }} /> : <Dashboard user={user} onNavigate={setCurrentPage} />
      case 'packinglist':     return <Resources user={user} canManageStaff={canManageStaff} initialSubPage={resourcesSubPage} onSubPageChange={setResourcesSubPage} />
      case 'ridingschedule': return <RidingSchedule user={user} />
      case 'shoppinglist':   return <ShoppingList user={user} />
      case 'tofixlist':      return <ToFixList user={user} />
      default:               return <Dashboard user={user} onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <img src="/lillie-logo copy.png" alt="Lillie Keenan" className="header-logo" />
          <div className="header-text">
            <h1>Chansonette Farm</h1>
            <span className="subtitle">Lillie Keenan · Rider</span>
          </div>
          <button
            className="text-size-btn text-size-btn-header"
            onClick={() => setLargeText(v => !v)}
            title="Toggle large text"
            style={{ marginLeft: 'auto', background: largeText ? '#c9a84c' : 'rgba(255,255,255,0.12)', border: '1px solid #c9a84c', borderRadius: 'var(--radius-sm)', color: largeText ? '#0d1b4b' : '#c9a84c', fontFamily: 'Arial', fontWeight: 700, fontSize: '0.8rem', padding: '0.3rem 0.65rem', cursor: 'pointer', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
          >{largeText ? 'Decrease Text Size' : 'Increase Text Size'}</button>
        </div>
      </header>

      <nav className="navbar">
        <ul className="nav-list">
          <li><button className={currentPage === 'dashboard'      ? 'active' : ''} onClick={() => setCurrentPage('dashboard')}>Home</button></li>
          <li><button className={currentPage === 'shows'          ? 'active' : ''} onClick={() => setCurrentPage('shows')}>Show &amp; Event Calendar</button></li>
          <li><button className={currentPage === 'ridingschedule' ? 'active' : ''} onClick={() => setCurrentPage('ridingschedule')}>Riding Schedule</button></li>
          <li><button className={currentPage === 'horses'         ? 'active' : ''} onClick={() => setCurrentPage('horses')}>Horses</button></li>
          <li className="nav-dropdown">
            <button className={currentPage === 'packinglist' ? 'active' : ''} onClick={() => { setResourcesSubPage(null); setCurrentPage('packinglist') }}>Resources ▾</button>
            <div className="nav-dropdown-menu">
              <button onClick={() => { setResourcesSubPage('packinglist'); setCurrentPage('packinglist') }}>Packing Lists</button>
              <button onClick={() => { setResourcesSubPage('staff'); setCurrentPage('packinglist') }}>Staff</button>
              <div className="dropdown-divider" />
              <button onClick={() => { setResourcesSubPage('vendors'); setCurrentPage('packinglist') }}>Vendors</button>
              <button onClick={() => { setResourcesSubPage('vendors_add'); setCurrentPage('packinglist') }}>+ Add Vendor</button>
            </div>
          </li>
          {isAdmin && <li><button className={currentPage === 'admin' ? 'active' : ''} onClick={() => setCurrentPage('admin')}>Admin</button></li>}
          <li className="nav-signout">
            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #c9a84c', borderRadius: '6px', color: '#c9a84c', cursor: 'pointer', fontFamily: 'Arial', fontSize: '0.75rem', fontWeight: 700, padding: '0.5rem 0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sign Out</button>
            <div style={{ fontFamily: 'Arial', fontSize: '0.7rem', color: '#c9a84c', marginTop: '0.4rem', textAlign: 'center', wordBreak: 'break-word' }}>
              {user?.name || user?.email || 'User'}
            </div>
          </li>
        </ul>
      </nav>

      <main className="main-content">
        {renderPage()}
      </main>

      <footer className="footer">
        <button
          className="text-size-btn text-size-btn-footer"
          onClick={() => setLargeText(v => !v)}
          style={{ background: largeText ? '#c9a84c' : 'rgba(255,255,255,0.12)', border: '1px solid #c9a84c', borderRadius: 'var(--radius-sm)', color: largeText ? '#0d1b4b' : '#c9a84c', fontFamily: 'Arial', fontWeight: 700, fontSize: '0.8rem', padding: '0.3rem 0.65rem', cursor: 'pointer', letterSpacing: '0.05em', whiteSpace: 'nowrap', marginBottom: '0.5rem' }}
        >{largeText ? 'Decrease Text Size' : 'Increase Text Size'}</button>
        <p>&copy; 2026 Chansonette Farm · Lillie Keenan Equestrian</p>
      </footer>
    </div>
  )
}

export default App
