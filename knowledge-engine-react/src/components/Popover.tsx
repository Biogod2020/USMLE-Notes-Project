// src/components/Popover.tsx
import { createPortal } from 'react-dom';
import { useRef, useState, useLayoutEffect } from 'react';

// MODIFIED: Reverted data structure
interface PopoverData {
  content: {
    emoji: string;
    title: string;
    definition: string;
  };
  x: number;
  y: number;
}

interface Props {
  data: PopoverData | null;
}

export function Popover({ data }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ display: 'none', opacity: 0 });

  useLayoutEffect(() => {
    if (data && popoverRef.current) {
      const { height, width } = popoverRef.current.getBoundingClientRect();
      const margin = 10;
      
      let top = data.y - height - margin;
      let left = data.x;

      if (top < margin) {
        top = data.y + margin * 2;
      }
      if (left + width > window.innerWidth - margin) {
        left = window.innerWidth - width - margin;
      }
      if (left < margin) {
        left = margin;
      }

      setStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        display: 'block',
        opacity: 1,
        transition: 'opacity 0.1s ease-in-out',
      });
    } else {
      setStyle({ display: 'none', opacity: 0 });
    }
  }, [data]);

  if (!data) return null;

  return createPortal(
    <div id="popover" ref={popoverRef} style={style}>
      {/* MODIFIED: Restored emoji rendering */}
      <h4><span className="emoji">{data.content.emoji}</span> {data.content.title}</h4>
      <p>{data.content.definition}</p>
    </div>,
    document.body
  );
}