'use client';

import React, { useEffect, useRef } from 'react';
import { Hand } from 'lucide-react';
import { ToolMode } from '@/types/workspace';
import { TOOL_GROUPS } from './toolDefinitions';

const tools = TOOL_GROUPS.flatMap(group => group.tools);

/** Araç ikonu doğrudan tıklama noktasında normal imlecin yerini alır. */
export function ToolCursor({ tool, surfaceRef }: {
  tool: ToolMode;
  surfaceRef: React.RefObject<SVGSVGElement>;
}) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const selected = tools.find(item => item.id === tool);

  useEffect(() => {
    const surface = surfaceRef.current;
    const badge = badgeRef.current;
    if (!surface || !badge) return;
    const hide = () => {
      badge.style.visibility = 'hidden';
      surface.removeAttribute('data-tool-cursor-active');
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' ||
          (event.target instanceof Element && event.target.closest('foreignObject'))) {
        hide();
        return;
      }
      const bounds = surface.parentElement!.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      // Rozetin merkezi gerçek işaretçi konumudur; kenarda da konum değişmez.
      badge.style.transform = `translate(${x - 15}px, ${y - 15}px)`;
      badge.style.visibility = 'visible';
      surface.setAttribute('data-tool-cursor-active', '');
    };
    surface.addEventListener('pointerenter', move);
    surface.addEventListener('pointermove', move, true);
    surface.addEventListener('pointerleave', hide);
    surface.addEventListener('pointercancel', hide);
    window.addEventListener('blur', hide);
    return () => {
      hide();
      surface.removeEventListener('pointerenter', move);
      surface.removeEventListener('pointermove', move, true);
      surface.removeEventListener('pointerleave', hide);
      surface.removeEventListener('pointercancel', hide);
      window.removeEventListener('blur', hide);
    };
  }, [surfaceRef]);

  return <div ref={badgeRef} data-tool-cursor={tool} aria-hidden="true"
    style={{ visibility: 'hidden' }}
    className={`absolute left-0 top-0 z-30 pointer-events-none w-[30px] h-[30px] rounded-lg border border-border shadow-sm bg-card flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 ${selected?.iconColor ?? 'text-foreground'}`}>
    {selected?.icon ?? <Hand className="w-5 h-5" />}
  </div>;
}
