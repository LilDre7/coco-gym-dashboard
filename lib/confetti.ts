"use client";

const COLORS = ["#84cc16", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function fireSuccessConfetti() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.pointerEvents = "none";
  root.style.overflow = "hidden";
  root.style.zIndex = "9999";

  const particleCount = 108;

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    const size = randomBetween(8, 14);
    const left = randomBetween(8, 92);
    const duration = randomBetween(900, 1500);
    const delay = randomBetween(0, 180);
    const drift = randomBetween(-140, 140);
    const rotate = randomBetween(-540, 540);

    particle.style.position = "absolute";
    particle.style.left = `${left}vw`;
    particle.style.top = "-24px";
    particle.style.width = `${size}px`;
    particle.style.height = `${size * 0.6}px`;
    particle.style.borderRadius = "999px";
    particle.style.background = COLORS[index % COLORS.length];
    particle.style.opacity = "0.95";
    particle.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
    particle.style.animation = `gym-confetti-fall ${duration}ms cubic-bezier(.2,.8,.2,1) ${delay}ms forwards`;
    particle.style.setProperty("--drift-x", `${drift}px`);
    particle.style.setProperty("--rotate", `${rotate}deg`);

    root.appendChild(particle);
  }

  if (!document.getElementById("gym-confetti-style")) {
    const style = document.createElement("style");
    style.id = "gym-confetti-style";
    style.textContent = `
      @keyframes gym-confetti-fall {
        0% {
          transform: translate3d(0, 0, 0) rotate(0deg);
          opacity: 0.95;
        }
        100% {
          transform: translate3d(var(--drift-x), 100vh, 0) rotate(var(--rotate));
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(root);
  window.setTimeout(() => root.remove(), 1900);
}
