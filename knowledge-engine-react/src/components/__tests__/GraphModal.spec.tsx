import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphModal } from '../GraphModal';
import type { KnowledgeBase } from '../../types';

vi.mock('../GraphCanvas', () => ({
  __esModule: true,
  default: () => <button data-testid="graph-body">Graph Body</button>,
}));

vi.mock('../VisNetworkCanvas', () => ({
  VisNetworkCanvas: () => <button data-testid="classic-view">Classic View</button>,
}));

const kb: KnowledgeBase = {};

beforeEach(() => {
  localStorage.clear();
});

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
    expect(beforeButton).toHaveFocus();

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
    expect(closeButton).toHaveFocus();

    await user.tab();
    const toggleButton = screen.getByRole('button', { name: /switch to modernized view/i });
    expect(toggleButton).toHaveFocus();

    await user.tab();
    const classicButton = screen.getByTestId('classic-view');
    expect(classicButton).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

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
      expect(beforeButton).toHaveFocus();
    });
  });

  test('allows switching to modernized view', async () => {
    const user = userEvent.setup();
    render(
      <GraphModal
        isOpen
        onClose={() => {}}
        knowledgeBase={kb}
        centerNodeId={null}
        onNodeClick={() => {}}
      />,
    );

    const toggleButton = screen.getByRole('button', { name: /switch to modernized view/i });
    await user.click(toggleButton);

    expect(screen.getByTestId('graph-body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to classic view/i })).toBeInTheDocument();
  });
});
