import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Route transition wrapper.
 *
 * Cross-fades pages with a small rise on enter. Respects reduced motion
 * (Framer Motion disables animations when `useReducedMotion` would opt out;
 * the CSS fallback keeps the exit instant too).
 */
const variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="popout">
      <motion.div
        key={location.pathname + location.search}
        initial="hidden"
        animate="show"
        exit="exit"
        variants={variants}
        className="page-slot"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
