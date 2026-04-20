export default function Dashboard({ user, onNavigate }) {
  const tiles = [
    {
      label: 'Show & Event Calendar',
      page:  'shows',
      img:   '/equestrian-leap.png',
    },
    {
      label: 'Riding Schedule',
      page:  'ridingschedule',
      img:   '/English Saddle.png',
    },
    {
      label: 'Resources',
      page:  'packinglist',
      img:   '/old-horseshoe-BLACK.png',
    },
    {
      label: 'Horses',
      page:  'horses',
      img:   '/Elegant horse silhouette in stance with saddle PNG.png',
      imgAlign: 'flex-end',
    },
    {
      label: 'Shopping List',
      page:  'shoppinglist',
      img:   '/Supplies for shopping list PNG.png',
    },
    {
      label: 'Barn "To Fix" List',
      page:  'tofixlist',
      img:   '/Broken Fence.png',
    },
  ]

  return (
    <div className="page">
      <h2 className="dashboard-welcome" style={{ textAlign: 'center' }}>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h2>

      <div className="dashboard-grid">
        {tiles.map(tile => (
          <div
            key={tile.page}
            className="card card-gold dashboard-tile"
            onClick={() => onNavigate(tile.page)}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = ''
              e.currentTarget.style.background = 'rgba(255,255,255,0.88)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--gold)'
              e.currentTarget.style.background = 'rgba(36,86,174,0.12)'
            }}
          >
            {tile.img ? (
              <div style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: tile.imgAlign || 'center',
                justifyContent: 'center',
                background: 'rgba(36,86,174,0.10)',
              }}>
                <img
                  src={tile.img}
                  alt={tile.label}
                  style={{ width: '85%', height: '85%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{
                flex: 1,
                background: 'rgba(36,86,174,0.10)',
              }} />
            )}
            <div className="tile-label" style={{
              padding: '0.75rem 1rem',
              fontFamily: 'Georgia',
              fontSize: '1rem',
              fontWeight: 'bold',
              color: '#0d1b4b',
              letterSpacing: '0.04em',
              textAlign: 'center',
              borderTop: '1px solid var(--border)',
            }}>
              {tile.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
