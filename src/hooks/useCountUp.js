import { useState, useEffect } from "react";

export function useCountUp(end, duration = 1600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!end || end <= 0) {
      setValue(0);
      return;
    }

    setValue(0);
    let startTime = null;
    let frameId;

    const tick = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(end * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [end, duration]);

  return value;
}
