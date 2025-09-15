"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { projects } from "@/lib/data/projects";
import { StardustButton } from "../ui/StardustButton";

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
  cards: { image?: string; title: string; id: number }[];
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
            key={card.id}
            className="absolute flex h-full origin-center items-center justify-center rounded-xl p-2"
            style={{
              width: `${faceWidth}px`,
              transform: `rotateY(${i * (360 / faceCount)}deg) translateZ(${radius}px)`,
            }}
            onClick={() => handleClick(i)}
          >
            {card.image ? (
              <motion.img
                src={card.image}
                alt={card.title}
                className="pointer-events-none w-full rounded-xl object-cover aspect-square"
                initial={{ filter: "blur(4px)" }}
                animate={{ filter: "blur(0px)" }}
                transition={transition}
              />
            ) : (
              <motion.div
                className="pointer-events-none w-full rounded-xl bg-neutral-800 aspect-square flex items-center justify-center"
                initial={{ filter: "blur(4px)" }}
                animate={{ filter: "blur(0px)" }}
                transition={transition}
              >
                <span className="text-white text-sm text-center p-4 break-words">
                  {card.title}
                </span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
});

export default function ThreeDProjectsCarousel() {
  // Projects starting from index 3 (after featured projects)
  const carouselProjects = useMemo(
    () => projects.slice(3),
    []
  );
  
  const cards = useMemo(
    () => carouselProjects.map((p) => ({ image: p.image, title: p.title, id: p.id })),
    [carouselProjects]
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

  if (carouselProjects.length === 0) {
    return (
      <div className="text-center text-neutral-500">
        No additional projects to display
      </div>
    );
  }

  return (
    <motion.div layout className="relative">
      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            transition={overlayTransition}
            onClick={handleClose}
          >
            <motion.div
              className="relative max-w-4xl max-h-[90vh] mx-4 bg-neutral-900 rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 text-white hover:text-neutral-300"
                aria-label="Close"
              >
                ✕
              </button>
              
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2">
                  {carouselProjects[activeIndex].image ? (
                    <img
                      src={carouselProjects[activeIndex].image}
                      alt={carouselProjects[activeIndex].title}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 md:h-full bg-neutral-800 flex items-center justify-center">
                      <span className="text-neutral-400">No image available</span>
                    </div>
                  )}
                </div>
                
                <div className="md:w-1/2 p-6">
                  <h3 className="text-2xl font-bold mb-4 text-white">
                    {carouselProjects[activeIndex].title}
                  </h3>
                  
                  {carouselProjects[activeIndex].description && (
                    <p className="text-neutral-300 mb-4">
                      {carouselProjects[activeIndex].description}
                    </p>
                  )}
                  
                  {carouselProjects[activeIndex].stack && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {carouselProjects[activeIndex].stack!.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-neutral-600 px-2 py-1 text-xs text-neutral-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Project Links */}
                  {(carouselProjects[activeIndex].demoUrl || carouselProjects[activeIndex].repoUrl) && (
                    <div className="flex gap-3">
                      {carouselProjects[activeIndex].demoUrl && (
                        <a
                          href={carouselProjects[activeIndex].demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline underline-offset-4 hover:no-underline text-blue-400"
                        >
                          Demo
                        </a>
                      )}
                      {carouselProjects[activeIndex].repoUrl && (
                        <a
                          href={carouselProjects[activeIndex].repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline underline-offset-4 hover:no-underline text-blue-400"
                        >
                          Repo
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative h-[500px] w-full overflow-hidden">
        <Carousel handleClick={handleClick} controls={controls} cards={cards} isActive={isActive} />
      </div>
    </motion.div>
  );
}