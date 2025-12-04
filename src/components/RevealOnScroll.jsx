import React, { useEffect, useRef, useState } from "react";

export default function RevealOnScroll({
  children,
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
  once = true,
}) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If browser doesn't support IntersectionObserver, just show.
    if (!("IntersectionObserver" in window)) {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          if (once) io.unobserve(entry.target);
        } else if (!once) {
          setShow(false);
        }
      },
      { threshold, rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin, once]);

  return (
    <div ref={ref} className={`reveal ${show ? "reveal--show" : ""}`}>
      {children}
    </div>
  );
}
