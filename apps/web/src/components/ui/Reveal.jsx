import { motion, useReducedMotion } from "framer-motion";

/**
 * Scroll-in reveal. Opacity/transform only, one-shot, and disabled when the
 * OS asks for reduced motion.
 */
export default function Reveal({
  children,
  as = "div",
  delay = 0,
  direction = "up",
  className,
  ...props
}) {
  const reduce = useReducedMotion();
  const Component = motion[as] || motion.div;

  const offsets = {
    up: { y: 26 },
    down: { y: -26 },
    left: { x: -24 },
    right: { x: 24 },
    scale: { scale: 0.97 },
  };

  if (reduce) {
    const Static = as;
    return (
      <Static className={className} {...props}>
        {children}
      </Static>
    );
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, ...(offsets[direction] || offsets.up) }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </Component>
  );
}
