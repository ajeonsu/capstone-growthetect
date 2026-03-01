'use client';

export default function LogoSplash() {
  return (
    <div className="logo-splash-screen">
      <div className="logo-splash-content">
        {/* Outer glow ring */}
        <div className="logo-splash-ring">
          {/* Inner pulse ring */}
          <div className="logo-splash-pulse" />
          {/* Logo image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="GROWTHetect" className="logo-splash-img" />
        </div>

        {/* Brand name */}
        <div className="logo-splash-title">
          <span className="text-green-400 font-extrabold">GROWTH</span>
          <span className="text-white font-extrabold">etect</span>
        </div>

        {/* Loading dots */}
        <div className="logo-splash-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
