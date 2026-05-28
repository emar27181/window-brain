import type { ReactNode } from 'react';

interface HeadProps {
  title: string;
  right?: ReactNode;
  children?: ReactNode;
  editable?: boolean;
}

export function Head({ title, right, children, editable }: HeadProps) {
  return (
    <div className="w-head">
      <div className="title">
        <span className="glyph"></span>
        {title}
        {editable && (
          <span className="edit-mark" title="編集できます" aria-label="編集可">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path
                d="M11.5 1.5L14.5 4.5M2 14L4.5 13.5L13.5 4.5L11.5 2.5L2.5 11.5L2 14Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </div>
      <div className="row">
        {right}
        {children}
      </div>
    </div>
  );
}
