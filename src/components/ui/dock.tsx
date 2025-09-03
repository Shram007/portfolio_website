'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

const DOCK_HEIGHT = 64;
const DEFAULT_MAGNIFICATION = 48;
const DEFAULT_DISTANCE = 10;
const DEFAULT_PANEL_HEIGHT = 48;

type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
  orientation?: "horizontal" | "vertical";
};
type DockItemProps = {
  className?: string;
  children: React.ReactNode;
};
type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};
type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DocContextType = {
  mouseX: MotionValue;
  mouseY: MotionValue;
  spring: SpringOptions;
  orientation: "horizontal" | "vertical";
  magnification: number;
  distance: number;
};
type DockProviderProps = {
  children: React.ReactNode;
  value: DocContextType;
};

const DockContext = createContext<DocContextType | undefined>(undefined);

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within an DockProvider');
  }
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
  orientation = "vertical",
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const mouseY = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  const maxHeight = useMemo(() => {
    return Math.max(DOCK_HEIGHT, magnification + magnification / 2 + 4);
  }, [magnification]);

  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div
      style={
        orientation === "vertical"
        ? { scrollbarWidth: "none" }                // no fixed height in vertical
        : { height, scrollbarWidth: "none" }        // keep animated height in horizontal
      }
      className={cn(
        "mx-2 flex max-w-full",
        orientation === "vertical"
          ? "items-center overflow-visible"           // let the column breathe
          : "items-end overflow-x-auto"               // old horizontal behavior
      )}
    >
      <motion.div
        onMouseMove={({ pageY, pageX }) => {
          isHovered.set(1);
          if (orientation === "vertical") {
            mouseY.set(pageY);
          } else {
            mouseX.set(pageX);
          }
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
          mouseY.set(Infinity);
        }}
        className={cn(
          orientation === "vertical"
            ? "mx-0 my-auto flex h-fit w-auto flex-col gap-4 rounded-full px-3 py-6 items-center"
            : "mx-auto flex w-fit gap-4 rounded-full px-6 py-3",
          className
        )}
        style={orientation === "vertical" ? undefined : { height: panelHeight }}
        role='toolbar'
        aria-label='Application dock'
      >
        <DockProvider value={{ mouseX, mouseY, orientation, spring, distance, magnification }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  );
}

function DockItem({ children, className }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { distance, magnification, mouseX, mouseY, spring, orientation } = useDock();

  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(
    orientation === "vertical" ? mouseY : mouseX,
    (val) => {
      const r = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 } as DOMRect;
      return orientation === "vertical"
        ? val - (r.y + r.height / 2)
        : val - (r.x + r.width / 2);
    }
  );

  const widthTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const width = useSpring(widthTransform, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width: width, height: width }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      tabIndex={0}
      role='button'
      aria-haspopup='true'
    >
      {Children.map(children, (child) =>
        typeof child === 'object' && child !== null && 'type' in child
          ? cloneElement(child as React.ReactElement<any>, { width: width, isHovered: isHovered })
          : child
      )}
    </motion.div>
  );
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>;
  const isHovered = restProps['isHovered'] as MotionValue<number>;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });

    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute right-full ml-3 whitespace-nowrap",
            "rounded-full bg-neutral-800/80 px-3 py-1 text-sm font-medium text-white shadow-lg backdrop-blur"
          )}
          role="tooltip"
        >
          {children}
      </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const width = restProps['width'] as MotionValue<number>;

  const widthTransform = useTransform(width, (val) => val / 2);

  return (
    <motion.div
      style={{ width: widthTransform }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
