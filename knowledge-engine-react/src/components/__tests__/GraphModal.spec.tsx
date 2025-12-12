// @vitest-environment jsdom
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphModal } from '../GraphModal';
import type { KnowledgeBase } from '../../types';

vi.mock('../VisNetworkCanvas', () => ({
  VisNetworkCanvas: () => <button data-testid="classic-view">Classic View</button>,
}));

const kb: KnowledgeBase = {};

describe('GraphModal', () => {
  test('traps focus inside dialog and restores focus after close', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    const { rerender } = render(
      <>
        <button data-testid="before">Before</button>
        <GraphModal
          isOpen={false}
          onClose={handleClose}
          knowledgeBase={kb}
          centerNodeId={null}
          onNodeClick={vi.fn()}
        />
      </>,
    );

    const beforeButton = screen.getByTestId('before');
    beforeButton.focus();
    expect(document.activeElement).toBe(beforeButton);

    rerender(
      <>
        <button data-testid="before">Before</button>
        <GraphModal
          isOpen
          onClose={handleClose}
          knowledgeBase={kb}
          centerNodeId={null}
          onNodeClick={vi.fn()}
        />
      </>,
    );

    const closeButton = screen.getByRole('button', { name: /close graph/i });
    expect(document.activeElement).toBe(closeButton);

    await user.tab();
    const classicButton = screen.getByTestId('classic-view');
    expect(document.activeElement).toBe(classicButton);

    await user.tab();
    expect(document.activeElement).toBe(closeButton);

    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalled();

    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalled();

    rerender(
      <>
        <button data-testid="before">Before</button>
        <GraphModal
          isOpen={false}
          onClose={handleClose}
          knowledgeBase={kb}
          centerNodeId={null}
          onNodeClick={vi.fn()}
        />
      </>,
    );

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(beforeButton);
    });
  });

  test('renders classic view and no modern toggle', () => {
    render(
      <GraphModal
        isOpen
        onClose={() => {}}
        knowledgeBase={kb}
        centerNodeId={null}
        onNodeClick={() => {}}
      />,
    );

    expect(screen.getByTestId('classic-view')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /modernized/i })).toBeNull();
  });
});
