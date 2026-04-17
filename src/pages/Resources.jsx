import { useState } from 'react'
import PackingList from './PackingList'
import Staff from './Staff'
import Vendors from './Vendors'

const RESOURCES = [
  {
    id: 'packinglist',
    label: 'Packing Lists',
    description: 'Show packing checklists by event',
    img: '/clipboard checklist.png',
  },
  {
    id: 'staff',
    label: 'Staff',
    description: 'View and manage barn staff',
    img: '/ChatGPT Image Apr 5, 2026, 12_24_22 AM.png',
  },
  {
    id: 'vendors',
    label: 'Vendors',
    description: 'Vets, farriers, suppliers & contacts',
    img: '/Blacksmith forging a horseshoe silhouette.png',
    img2: '/Veterinarian examines horse in silhouette.png',
  },
]

export default function Resources({ user, canManageStaff, initialSubPage, onSubPageChange }) {
  const [subPage, setSubPage] = useState(initialSubPage || null)

  function goTo(page) {
    setSubPage(page)
    onSubPageChange?.(page)
  }

  const visibleResources = RESOURCES

  if (subPage === 'packinglist') {
    return (
      <div>
        <button
          onClick={() => goTo(null)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontFamily: 'Arial', fontSize: '0.8rem', letterSpacing: '0.06em',
            cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center',
            gap: '0.35rem', marginBottom: '1.5rem', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          ← Resources
        </button>
        <PackingList user={user} />
      </div>
    )
  }

  if (subPage === 'vendors' || subPage === 'vendors_add') {
    return (
      <div>
        <button
          onClick={() => goTo(null)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontFamily: 'Arial', fontSize: '0.8rem', letterSpacing: '0.06em',
            cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center',
            gap: '0.35rem', marginBottom: '1.5rem', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          ← Resources
        </button>
        <Vendors user={user} openAddForm={subPage === 'vendors_add'} />
      </div>
    )
  }

  if (subPage === 'staff') {
    return (
      <div>
        <button
          onClick={() => goTo(null)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontFamily: 'Arial', fontSize: '0.8rem', letterSpacing: '0.06em',
            cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center',
            gap: '0.35rem', marginBottom: '1.5rem', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          ← Resources
        </button>
        <Staff user={user} />
      </div>
    )
  }

  return (
    <div className="page">
      <h2>Resources</h2>
      <p className="page-subtitle">Chansonette Farm</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {visibleResources.map(r => (
          <div
            key={r.id}
            className="card card-gold"
            style={{ cursor: 'pointer', textAlign: 'center' }}
            onClick={() => goTo(r.id)}
          >
            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {r.img
                ? <>
                    <img src={r.img} alt={r.label} style={{ maxHeight: '72px', maxWidth: r.img2 ? '45%' : '100%', objectFit: 'contain' }} />
                    {r.img2 && <img src={r.img2} alt={r.label} style={{ maxHeight: '72px', maxWidth: '45%', objectFit: 'contain' }} />}
                  </>
                : <span style={{ fontSize: '2.5rem' }}>{r.icon}</span>
              }
            </div>
            <div style={{ fontFamily: 'Georgia', fontSize: '1.4rem', color: 'var(--gold)', marginBottom: '0.3rem' }}>{r.label}</div>
            <div style={{ fontFamily: 'Arial', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
