'use client';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  spread?: number;
}

const ShinyText = ({
  text,
  disabled = false,
  speed = 3,
  className = '',
  color = '#86efac',
  shineColor = '#ffffff',
  spread = 120,
}: ShinyTextProps) => {
  const duration = `${speed}s`;

  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: disabled ? 'none' : `shinyTextSweep ${duration} linear infinite`,
    display: 'inline-block',
  };

  return (
    <span className={className} style={gradientStyle}>
      {text}
    </span>
  );
};

export default ShinyText;

