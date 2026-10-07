interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** Nombre común de los radios: es lo que los agrupa para el teclado (flechas) y para el lector. */
  name: string;
  options: Array<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Una de las dos: etiqueta directa o id del elemento visible que da nombre al grupo. */
  ariaLabel?: string;
  labelledBy?: string;
  /** Id del texto que describe el grupo (se lee después del nombre, antes de elegir). */
  describedBy?: string;
  className?: string;
}

/**
 * Selección única excluyente y reversible: grupo de radios nativos con aspecto segmentado.
 * Las flechas eligen (comportamiento nativo del grupo de radio) y el elegido lleva una marca
 * además del color, así que el estado no depende solo del color. Los radios reales quedan
 * encima, transparentes, para que el área de toque sea todo el segmento.
 */
export function Segmented<T extends string>({
  name,
  options,
  value,
  onChange,
  ariaLabel,
  labelledBy,
  describedBy,
  className,
}: Props<T>) {
  return (
    <div
      className={className ? `segs ${className}` : 'segs'}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      {options.map((option) => (
        <label key={option.value} className="seg">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
