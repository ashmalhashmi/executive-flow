const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 transition focus:border-indigo-500/40 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export default function FormField({
  label,
  id,
  hint,
  error,
  children,
  className = '',
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-zinc-600">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className = '', ...props }) {
  return <input className={[inputClass, className].join(' ')} {...props} />;
}

export function TextArea({ className = '', rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={[inputClass, 'resize-y min-h-[100px]', className].join(' ')}
      {...props}
    />
  );
}

export function SelectInput({ className = '', children, ...props }) {
  return (
    <select className={[inputClass, className].join(' ')} {...props}>
      {children}
    </select>
  );
}
