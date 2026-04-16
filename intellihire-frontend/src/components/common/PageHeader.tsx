// components/common/PageHeader.tsx
// Fully responsive — scales gracefully from 320px to 1440px+

import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
}) => {
  return (
    <>
      <style>{`
        .page-header-root {
          margin-bottom: clamp(24px, 5vw, 32px);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }
        .page-header-title {
          font-size: clamp(22px, 5vw, 30px);
          font-weight: 700;
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          /* Fallback for browsers that don't support gradient text */
          color: #2563eb;
          line-height: 1.2;
          letter-spacing: -0.5px;
        }
        .page-header-description {
          color: #6b7280;
          margin-top: 6px;
          font-size: clamp(13px, 2vw, 15px);
          line-height: 1.6;
          max-width: 560px;
        }
        .page-header-actions {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 480px) {
          .page-header-root {
            flex-direction: column;
            align-items: flex-start;
          }
          .page-header-actions {
            width: 100%;
          }
          /* Make action buttons full-width on very small screens if they're alone */
          .page-header-actions > button:only-child,
          .page-header-actions > a:only-child {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className={cn('page-header-root', className)}>
        <div>
          <h1 className="page-header-title">{title}</h1>
          {description && (
            <p className="page-header-description">{description}</p>
          )}
        </div>
        {actions && (
          <div className="page-header-actions">{actions}</div>
        )}
      </div>
    </>
  );
};