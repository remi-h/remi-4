import type { CSSProperties, ReactNode } from 'react';

export type WindowProps = {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** A framed panel with a titlebar, used for code, project cards and other "files". */
export const Window = ({ title, meta, className = '', style, children }: WindowProps) => (
  <div className={`border border-line bg-panel ${className}`} style={style}>
    <div className="flex justify-between gap-3 border-b border-line bg-panel-2 px-3.5 py-2 text-xs text-muted">
      <span>{title}</span>
      {meta ? <span>{meta}</span> : null}
    </div>
    {children}
  </div>
);
