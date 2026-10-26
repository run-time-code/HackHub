import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef } from "react";

const Switch = forwardRef(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root ref={ref} className={className ? `switch ${className}` : "switch"} {...props}>
      <SwitchPrimitive.Thumb className="switch__thumb" />
    </SwitchPrimitive.Root>
  );
});

export default Switch;
