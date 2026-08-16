"use client";

import { MotionConfig } from "framer-motion";

/** Respects prefers-reduced-motion for every framer-motion animation in the tree. */
const MotionProvider = ({ children }: { children: React.ReactNode }) => (
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
);

export default MotionProvider;
