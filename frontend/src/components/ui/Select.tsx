import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id: suppliedId, children, className = '', ...props }, ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const description = [props['aria-describedby'], hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="field">
    <label htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    <select {...props} id={id} ref={ref} className={`input ${className}`} aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={description}>{children}</select>
    {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
    {error && <p id={`${id}-error`} className="field-error">{error}</p>}
  </div>;
});
