"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { projects } from "@/lib/data/projects";

const IS_SERVER = typeof window === "undefined";
const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function useMediaQuery(query: string, { defaultValue = false } = {}) {
  const get = (q: string) => (IS_SERVER ? defaultValue : window.matchMedia(q).matches);
  const [match, setMatch] = useState(() => get(query));
  useIsoLayout(() => {
    const mm = window.matchMedia(query);
    const onChange = () => setMatch(get(query));
    onChange(); mm.addEventListener("change", onChange);
    return () => mm.removeEventListener("change", onChange);
  }, [query]);
  return match;
}

const transition = { duration: 0.15, ease: [0.32, 0.72, 0, 1] as const };
const overlayTransition = { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const };

const Carousel = memo(function Carousel({
  handleClick, controls, cards, isActive,
}: {
  handleClick: (index: number) => void;
  controls: any;
  cards: { image: string; title: string }[];
  isActive: boolean;
}) {
  const isSm = useMediaQuery("(max-width: 640px)");
  const cylinderWidth = isSm ? 1100 : 1800;
  const faceCount = cards.length;
  const faceWidth = Math.max(220, cylinderWidth / faceCount);
  const radius = cylinderWidth / (2 * Math.PI);
  const rotation = useMotionValue(0);
  const transform = useTransform(rotation, (v) => `rotate3d(0, 1, 0, ${v}deg)`);

  return (
    <div className="flex h-full items-center justify-center" style={{ perspective: "1000px", transformStyle: "preserve-3d" }}>
      <motion.div
        drag={isActive ? "x" : false}
        className="relative flex h-full origin-center cursor-grab justify-center active:cursor-grabbing"
        style={{ transform, rotateY: rotation, width: cylinderWidth, transformStyle: "preserve-3d" }}
        onDrag={(_, info) => isActive && rotation.set(rotation.get() + info.offset.x * 0.05)}
        onDragEnd={(_, info) =>
          isActive &&
          controls.start({
            rotateY: rotation.get() + info.velocity.x * 0.05,
            transition: { type: "spring", stiffness: 100, damping: 30, mass: 0.1 },
          })
        }
        animate={controls}
      >
        {cards.map((card, i) => (
          <motion.div
            key={i}
            className="absolute flex h-full origin-center items-center justify-center rounded-xl p-2"
            style={{
              width: `${faceWidth}px`,
              transform: `rotateY(${i * (360 / faceCount)}deg) translateZ(${radius}px)`,
            }}
            onClick={() => handleClick(i)}
          >
            <motion.img
              src={card.image}
              alt={card.title}
              className="pointer-events-none w-full rounded-xl object-cover aspect-square"
              initial={{ filter: "blur(4px)" }}
              animate={{ filter: "blur(0px)" }}
              transition={transition}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

export default function ThreeDProjectsCarousel() {
  // Only projects with an image
  const cards = useMemo(
    () => projects.filter((p) => p.image).map((p) => ({ image: p.image!, title: p.title })),
    []
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const controls = useAnimation();

  // Accessibility: auto-disable if user prefers reduced motion
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReduced) return null;

  const handleClick = (index: number) => {
    setActiveIndex(index);
    setIsActive(false);
    controls.stop();
  };
  const handleClose = () => {
    setActiveIndex(null);
    setIsActive(true);
  };

  return (
    <motion.div layout className="relative">
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 m-5 md:m-24 lg:mx-[18rem] rounded-3xl bg-black/60 backdrop-blur-sm flex items-center justify-center"
            transition={overlayTransition}
          >
            <motion.img
              src={cards[activeIndex].image}
              alt={cards[activeIndex].title}
              className="max-w-full max-h-full rounded-xl shadow-2xl"
            />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="relative h-[500px] w-full overflow-hidden">
        <Carousel handleClick={handleClick} controls={controls} cards={cards} isActive={isActive} />
      </div>
    </motion.div>
  );
}
