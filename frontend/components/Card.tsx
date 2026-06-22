export function Card({
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      {(eyebrow || title || subtitle) && (
        <div className="mb-4">
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          {title && <div className="section-title">{title}</div>}
          {subtitle && <div className="section-sub">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
