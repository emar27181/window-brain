export function YouTubeWidget() {
  return (
    <div className="w-body" style={{ padding: 0 }}>
      <div style={{ position: 'absolute', top: 14, left: 18, right: 18, display: 'flex', justifyContent: 'space-between', zIndex: 2 }}>
        <div className="w-head" style={{ margin: 0 }}>
          <div className="title" style={{ color: '#fff' }}>
            <span className="glyph" style={{ background: '#ff3355', boxShadow: '0 0 8px #ff3355' }}></span>
            LIVE STREAM
          </div>
        </div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.7)' }}>1.2K WATCHING</div>
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.1) 35%, rgba(0,0,0,.0) 60%, rgba(0,0,0,.6) 100%),
                     linear-gradient(160deg,#3a2a55 0%,#5a3068 30%,#a8556a 60%,#f0a070 100%)`
      }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: '58%', height: 1, background: 'rgba(255,255,255,.2)' }} />
        <div style={{ position: 'absolute', left: '55%', top: '42%', width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffd4a0, #ff8060 60%, transparent 75%)', opacity: .9 }} />
        <div style={{ position: 'absolute', inset: '12% 10% 12% 10%', border: '2px solid rgba(0,0,0,.35)', borderRadius: 2 }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(0,0,0,.35)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'rgba(0,0,0,.35)' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 18, bottom: 14, right: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#fff', zIndex: 2 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-.005em' }}>lofi hip hop radio — beats to relax/study to</div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.14em', marginTop: 4, opacity: .7 }}>CHILLEDCOW · 24/7</div>
        </div>
        <button style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(10px)', border: '.5px solid rgba(255,255,255,.3)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="11" height="12" viewBox="0 0 11 12"><path d="M0 0L11 6L0 12Z" fill="currentColor" /></svg>
        </button>
      </div>
    </div>
  );
}
