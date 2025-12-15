import { memo } from 'react';

interface Props {
  icon: string | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = memo(({ icon, title, description, action }: Props) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {typeof icon === 'string' ? <span className="emoji-icon">{icon}</span> : icon}
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button className="primary-btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3rem 1.5rem;
          color: var(--text-muted);
          animation: fade-in 0.3s ease-out;
          height: 100%;
          min-height: 300px;
        }
        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.8;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.05));
        }
        .emoji-icon {
           display: inline-block;
           animation: float 3s ease-in-out infinite;
        }
        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-color);
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          font-size: 0.95rem;
          max-width: 300px;
          line-height: 1.5;
        }
        .primary-btn {
          margin-top: 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 99px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .primary-btn:active {
          transform: scale(0.96);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
});
