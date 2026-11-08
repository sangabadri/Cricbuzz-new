import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeliveryKeypad } from '../DeliveryKeypad';

describe('DeliveryKeypad Component - Compound Scoring & Modifiers', () => {
  it('calls onRuns directly when no extra modifier is selected', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    const fourBtn = screen.getByRole('button', { name: /boundary/i });
    fireEvent.click(fourBtn);

    expect(onRuns).toHaveBeenCalledWith(4);
    expect(onExtra).not.toHaveBeenCalled();
  });

  it('records compound delivery: No Ball + 4 runs off bat (5 total)', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    // Click No Ball to select modifier
    const nbBtn = screen.getByRole('button', { name: /\+1 No Ball/i });
    fireEvent.click(nbBtn);

    // Active modifier notification banner should appear
    expect(screen.getByText(/Compound Modifier:/i)).toBeInTheDocument();
    expect(screen.getByText(/NO BALL active/i)).toBeInTheDocument();

    // Click 4 runs off the bat
    const fourBtn = screen.getByRole('button', { name: /4 bat/i });
    fireEvent.click(fourBtn);

    // onExtra('noball', 1, 4) should be called
    expect(onExtra).toHaveBeenCalledWith('noball', 1, 4);
    expect(onRuns).not.toHaveBeenCalled();

    // Modifier should be reset
    expect(screen.queryByText(/Compound Modifier:/i)).not.toBeInTheDocument();
  });

  it('records compound delivery: Wide + 1 bye (2 wides total)', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    // Click Wide to select modifier
    const wideBtn = screen.getByRole('button', { name: /\+1 Wide/i });
    fireEvent.click(wideBtn);

    expect(screen.getByText(/WIDE active/i)).toBeInTheDocument();

    // Click 1 run
    const oneBtn = screen.getByRole('button', { name: /\+2 Wides/i });
    fireEvent.click(oneBtn);

    // onExtra('wide', 2, 0)
    expect(onExtra).toHaveBeenCalledWith('wide', 2, 0);
  });

  it('records compound delivery: 2 Byes and 3 Leg Byes', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    const { rerender } = render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    // Click Bye modifier
    const byeBtn = screen.getByRole('button', { name: /\+1 Bye/i });
    fireEvent.click(byeBtn);

    // Click 2
    const twoBtn = screen.getByRole('button', { name: /\+2 Byes/i });
    fireEvent.click(twoBtn);

    expect(onExtra).toHaveBeenCalledWith('bye', 2, 0);

    // Rerender and test leg bye
    rerender(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    const legByeBtn = screen.getByRole('button', { name: /\+1 Leg Bye/i });
    fireEvent.click(legByeBtn);

    const threeBtn = screen.getByRole('button', { name: /\+3 L-Byes/i });
    fireEvent.click(threeBtn);

    expect(onExtra).toHaveBeenCalledWith('leg-bye', 3, 0);
  });

  it('submits 1-click fallback when clicking an already-selected extra button a second time', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    const wideBtn = screen.getByRole('button', { name: /\+1 Wide/i });
    fireEvent.click(wideBtn); // Selects wide

    const activeWideBtn = screen.getByRole('button', { name: /✓ Wide Active/i });
    fireEvent.click(activeWideBtn); // Second click triggers direct +1

    expect(onExtra).toHaveBeenCalledWith('wide', 1, 0);
  });

  it('submits 1-click fallback via the Quick +1 button in the banner', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    const nbBtn = screen.getByRole('button', { name: /\+1 No Ball/i });
    fireEvent.click(nbBtn);

    const quickBtn = screen.getByRole('button', { name: /Quick \+1 No Ball/i });
    fireEvent.click(quickBtn);

    expect(onExtra).toHaveBeenCalledWith('noball', 1, 0);
  });

  it('cancels modifier selection when the cancel icon button is clicked', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    const wideBtn = screen.getByRole('button', { name: /\+1 Wide/i });
    fireEvent.click(wideBtn);

    expect(screen.getByText(/WIDE active/i)).toBeInTheDocument();

    const cancelBtn = screen.getByTitle(/Cancel compound modifier/i);
    fireEvent.click(cancelBtn);

    expect(screen.queryByText(/WIDE active/i)).not.toBeInTheDocument();
    expect(onExtra).not.toHaveBeenCalled();
  });

  it('displays singular labels +1 Bye and +1 Leg Bye for single extra selections', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    const { rerender } = render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    const byeBtn = screen.getByRole('button', { name: /\+1 Bye/i });
    fireEvent.click(byeBtn);

    // Button 1 should say +1 Bye (not +1 Byes) and Button 2 should say +2 Byes
    expect(
      screen.getByRole('button', {
        name: (_content, element) =>
          Boolean(element?.textContent?.includes('+1 Bye') && element?.textContent?.includes('[1]')),
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: (_content, element) =>
          Boolean(element?.textContent?.includes('+2 Byes') && element?.textContent?.includes('[2]')),
      })
    ).toBeInTheDocument();

    rerender(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
      />
    );

    const legByeBtn = screen.getByRole('button', { name: /\+1 Leg Bye/i });
    fireEvent.click(legByeBtn);

    expect(
      screen.getByRole('button', {
        name: (_content, element) =>
          Boolean(element?.textContent?.includes('+1 Leg Bye') && element?.textContent?.includes('[1]')),
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: (_content, element) =>
          Boolean(element?.textContent?.includes('+2 L-Byes') && element?.textContent?.includes('[2]')),
      })
    ).toBeInTheDocument();
  });

  it('strictly rejects actions when disabled prop is true', () => {
    const onRuns = vi.fn();
    const onExtra = vi.fn();
    const onOpenWicketModal = vi.fn();

    render(
      <DeliveryKeypad
        onRuns={onRuns}
        onExtra={onExtra}
        onOpenWicketModal={onOpenWicketModal}
        disabled={true}
      />
    );

    const nbBtn = screen.getByRole('button', { name: /\+1 No Ball/i });
    fireEvent.click(nbBtn);

    // Modifier banner should not appear because keypad is disabled
    expect(screen.queryByText(/Compound Modifier:/i)).not.toBeInTheDocument();
    expect(onExtra).not.toHaveBeenCalled();
    expect(onRuns).not.toHaveBeenCalled();
  });
});
