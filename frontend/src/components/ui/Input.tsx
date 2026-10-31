import { forwardRef, useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id: suppliedId, className = '', ...props }, ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const description = [props['aria-describedby'], hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="field">
    <label htmlFor={id}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    <input {...props} id={id} ref={ref} className={`input ${className}`} aria-invalid={error ? true : props['aria-invalid']}
      aria-describedby={description} />
    {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
    {error && <p id={`${id}-error`} className="field-error">{error}</p>}
  </div>;
});
