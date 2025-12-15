import { useLayoutEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import type { KnowledgeBase } from '../types';
import { useHaptics } from '../hooks/useHaptics';
import { useIsMobile } from '../hooks/useIsMobile';
import './graphModal.css';
import { VisNetworkCanvas } from './VisNetworkCanvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: KnowledgeBase;
  centerNodeId: string | null;
  onNodeClick: (topicId: string) => void;
}

const FOCUSABLE_SELECTORS = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function GraphModal({ isOpen, onClose, ...graphProps }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobile();
  const haptics = useHaptics();

  const handleOverlayClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleNodeClick = (id: string) => {
      if (isMobile) haptics.selection();
      graphProps.onNodeClick(id);
  };

  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement;
    const node = modalRef.current;
    const focusInitial = node?.querySelector<HTMLElement>('[data-autofocus]') || node?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
    focusInitial?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(el => !el.hasAttribute('disabled'));
      if (focusable.length === 0) {
        event.preventDefault();
        (node as HTMLElement).focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    node?.addEventListener('keydown', trapFocus);
    return () => {
      node?.removeEventListener('keydown', trapFocus);
      lastFocusedRef.current?.focus();
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  return (
    <div className="modal" style={{ display: 'block' }} onClick={handleOverlayClick}>
      <div
        className="modal-content"
        style={{display: 'flex', flexDirection: 'column'}}
        role="dialog"
        aria-modal="true"
        aria-label="Knowledge graph"
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2><span className="emoji">🕸️</span>Knowledge Graph</h2>
          <div className="view-controls">
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close graph" data-autofocus>
              &times;
            </button>
          </div>
        </div>
        <div style={{flexGrow: 1, position: 'relative', minHeight: '480px'}}>
          <VisNetworkCanvas {...graphProps} onNodeClick={handleNodeClick} />
        </div>
      </div>
    </div>
  );
}
