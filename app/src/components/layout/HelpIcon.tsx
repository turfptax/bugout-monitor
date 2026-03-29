import { useState, useRef } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useClick,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import helpContent from '../../lib/helpContent';
import { useUIStore } from '../../store/useUIStore';

interface Props {
  helpKey: string;
}

export default function HelpIcon({ helpKey }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const helpMode = useUIStore((s) => s.helpMode);
  const arrowRef = useRef(null);

  const entry = helpContent[helpKey];
  if (!entry) return null;

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { enabled: true });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    click,
    dismiss,
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full border text-[9px] font-bold leading-none cursor-help transition-all duration-150 ${
          helpMode
            ? 'border-accent-2 text-accent-2 bg-accent-2/10 animate-pulse'
            : 'border-border text-text-dim hover:border-accent-2 hover:text-accent-2'
        }`}
      >
        ?
      </button>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[999] bg-surface-2 border border-border rounded-md px-3 py-2 max-w-[280px] shadow-lg"
          >
            <div ref={arrowRef} />
            <div className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1">
              {entry.title}
            </div>
            <div className="text-xs text-text-dim leading-relaxed">
              {entry.content}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
