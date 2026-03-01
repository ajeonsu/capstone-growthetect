'use client';

import { useState } from 'react';

export default function LogoSplash({ noLogo = false }: { noLogo?: boolean }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1628 0%, #0e2240 40%, #0a2e1a 100%)',
    }}>
      <style>{`
        @keyframes splashBreath {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
        @keyframes splashRingExpand {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes splashFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .splash-img-loaded { animation: splashBreath 2s ease-in-out infinite; }
        .splash-ring-pulse { animation: splashRingExpand 2s ease-in-out infinite; }
        .splash-dot-1 { animation: dotBounce 1.4s ease-in-out infinite; animation-delay: 0s; }
        .splash-dot-2 { animation: dotBounce 1.4s ease-in-out infinite; animation-delay: 0.2s; }
        .splash-dot-3 { animation: dotBounce 1.4s ease-in-out infinite; animation-delay: 0.4s; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        {/* Ring + Logo */}
        {!noLogo && (
        <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulsing ring */}
          <div className="splash-ring-pulse" style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(74,222,128,0.5)',
          }} />
          {/* Placeholder circle while image loads */}
          {!imgLoaded && (
            <div style={{
              width: 90,
              height: 90,
              borderRadius: 16,
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.2)',
            }} />
          )}
          {/* Logo — hidden until loaded */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="GROWTHetect"
            className={imgLoaded ? 'splash-img-loaded' : ''}
            onLoad={() => setImgLoaded(true)}
            width={90}
            height={90}
            style={{
              width: 90,
              height: 90,
              objectFit: 'contain',
              borderRadius: 16,
              filter: 'drop-shadow(0 0 20px rgba(74,222,128,0.4))',
              position: imgLoaded ? 'relative' : 'absolute',
              zIndex: 1,
              opacity: imgLoaded ? 1 : 0,
              animation: imgLoaded ? undefined : 'none',
            }}
          />
        </div>
        )}

        {/* Brand name */}
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
          <span style={{ color: '#4ade80' }}>GROWTH</span>
          <span style={{ color: '#ffffff' }}>etect</span>
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(['splash-dot-1', 'splash-dot-2', 'splash-dot-3'] as const).map((cls) => (
            <span key={cls} className={cls} style={{
              display: 'block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#4ade80',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
