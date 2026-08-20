"use client";

import { motion } from "framer-motion";

/**
 * The design's `data-reveal` behaviour: fade + 30px rise once on entry.
 * framer-motion is already a dependency, so no IntersectionObserver of our own.
 */
const Reveal = ({
    children,
    delay = 0,
    className,
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) => (
    <motion.div
        className={className}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -40px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut", delay }}
    >
        {children}
    </motion.div>
);

export default Reveal;
