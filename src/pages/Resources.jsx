import { useState, useEffect } from 'react'
import PackingList from './PackingList'
import Staff from './Staff'
import Vendors from './Vendors'
import ShoppingList from './ShoppingList'
import ToFixList from './ToFixList'

const RESOURCES = [
  {
    id: 'packinglist',
    label: 'Packing Lists',
    description: 'Show packing checklists by event',
    img: '/Road Case.png',
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
    img: "/Tools of the farrier's trade.png",
  },
  {
    id: 'shoppinglist',
    label: 'Shopping List',
    description: 'Supplies and items to order',
    img: '/Supplies for shopping list PNG.png',
  },
  {
    id: 'tofixlist',
    label: 'Fix It List',
    description: 'Repairs and maintenance tasks',
    img: '/Broken Fence.png',
  },
]

const BACK_BTN_STYLE = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  fontFamily: 'Arial', fontSize: '0.8rem', letterSpacing: '0.06em',
  cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center',
  gap: '0.35rem', marginBottom: '1.5rem', transition: 'color 0.15s',
}

function BackButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={BACK_BTN_STYLE}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
    >
      ← Resources
    </button>
  )
}

export default function Resources({ user, canManageStaff, initialSubPage, onSubPageChange }) {
  const [subPage, setSubPage] = useState(initialSubPage || null)

  useEffect(() => { setSubPage(initialSubPage || null) }, [initialSubPage])

  function goTo(page) {
    setSubPage(page)
    onSubPageChange?.(page)
  }

  if (subPage === 'packinglist') {
    return <div><BackButton onClick={() => goTo(null)} /><PackingList user={user} /></div>
  }

  if (subPage === 'vendors' || subPage === 'vendors_add') {
    return <div><BackButton onClick={() => goTo(null)} /><Vendors user={user} openAddForm={subPage === 'vendors_add'} /></div>
  }

  if (subPage === 'staff') {
    return <div><BackButton onClick={() => goTo(null)} /><Staff user={user} /></div>
  }

  if (subPage === 'shoppinglist') {
    return <div><BackButton onClick={() => goTo(null)} /><ShoppingList user={user} /></div>
  }

  if (subPage === 'tofixlist') {
    return <div><BackButton onClick={() => goTo(null)} /><ToFixList user={user} /></div>
  }

  return (
    <div className="page">
      <h2>Resources</h2>
      <p className="page-subtitle">Chansonette Farm</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {RESOURCES.map(r => (
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
