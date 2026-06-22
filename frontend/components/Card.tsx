export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      {title && <div className="section-title">{title}</div>}
      {subtitle && <div className="section-sub mb-3">{subtitle}</div>}
      {children}
    </div>
  );
}
