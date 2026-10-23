/** macOS-style segmented control (no native HTML equivalent). */
export default function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T;
  options: [T, React.ReactNode][];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="ns-segmented" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}
