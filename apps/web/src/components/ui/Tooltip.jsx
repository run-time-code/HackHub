import * as TooltipPrimitive from "@radix-ui/react-tooltip";

/**
 * Tooltip primitive (Week 4 T1: tooltips).
 *
 * Usage:
 *   <Tooltip trigger={<IconButton label="…" />}>Edit profile</Tooltip>
 *
 * Short task help only — never duplicates a visible label.
 */
export function Tooltip({ trigger, children, className }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{trigger}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={className}
          side="top"
          sideOffset={7}
        >
          <TooltipPrimitive.Arrow className="tooltip__arrow" />
          <span className="tooltip__content">{children}</span>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export default Tooltip;
