'use client';

interface ModuleLoaderProps {
  text?: string;
  size?: 'sm' | 'md';
}

export default function ModuleLoader({ text = 'Loading...', size = 'md' }: ModuleLoaderProps) {
  const imgSize = size === 'sm' ? 32 : 48;
  return (
    <div className="module-loader">
      <div className="module-loader-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Loading"
          className="module-loader-logo"
          style={{ width: imgSize, height: imgSize }}
        />
        <div className="module-loader-ring" style={{ width: imgSize + 20, height: imgSize + 20 }} />
      </div>
      {text && <p className="module-loader-text">{text}</p>}
    </div>
  );
}
