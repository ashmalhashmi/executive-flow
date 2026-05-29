/**
 * Reusable glassmorphism surface — used across dashboard cards and panels.
 */
export default function GlassCard({
  children,
  className = '',
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={[
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md',
        'shadow-lg shadow-black/20',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Component>
  );
}
