import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  position?: "bottom" | "top";
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  position = "bottom",
}: BottomSheetProps) {
  const hideHeader = position === "top" && !title;
  const [maxHeight, setMaxHeight] = useState("75vh");
  const [translateY, setTranslateY] = useState(0);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ startY: 0, startTranslate: 0 });
  const isDragging = useRef(false);

  const animateClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setTranslateY(position === "bottom" ? 400 : -400);
    setTimeout(() => {
      setClosing(false);
      setTranslateY(0);
      onClose();
    }, 200);
  }, [closing, position, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) animateClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, animateClose]);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboardHeight = window.innerHeight - vv!.height;
      if (keyboardHeight > 0) {
        setMaxHeight(`${Math.max(vv!.height * 0.85, 200)}px`);
      } else {
        setMaxHeight("75vh");
      }
    };

    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
      ) {
        active.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [open]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (position === "bottom") return;
      isDragging.current = true;
      drag.current = {
        startY: e.touches[0].clientY,
        startTranslate: translateY,
      };
    },
    [translateY, position],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || closing || position === "bottom") return;
      const diff = e.touches[0].clientY - drag.current.startY;
      const damped = diff * 0.6;
      setTranslateY(damped);
    },
    [position, closing, translateY],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (translateY > 120) {
      animateClose();
      return;
    }
    setTranslateY(0);
  }, [translateY, animateClose]);

  if (!open && !closing) return null;

  const isTop = position === "top";

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${isTop ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`absolute inset-0 bg-scrim transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
        onClick={animateClose}
        role="presentation"
      />
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-surface-elevated shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ease-out ${isTop ? "rounded-b-2xl" : "rounded-t-2xl"}`}
        style={{
          maxHeight: isTop ? "90vh" : maxHeight,
          transform: `translateY(${translateY}px)`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {position === "bottom" && (
          <div
            className="flex justify-center pt-2 pb-0 shrink-0"
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-1 rounded-full bg-text-tertiary/40" />
          </div>
        )}
        {!hideHeader && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={animateClose}
              className="p-1.5 rounded-md hover:bg-surface text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
