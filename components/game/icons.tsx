import type { CSSProperties } from "react";
export function Icon({
  name,
  size = 24,
  className = "",
  style,
}: {
  name:
    | "calculator"
    | "paw"
    | "fire"
    | "star"
    | "heart"
    | "arrow"
    | "back"
    | "close"
    | "check"
    | "book"
    | "gear"
    | "bulb"
    | "bowl"
    | "erase"
    | "plus"
    | "home"
    | "flask";
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const paths = {
    flask: <><path d="M9 2h6M10 2v6L4.5 18.5A2.3 2.3 0 0 0 6.6 22h10.8a2.3 2.3 0 0 0 2.1-3.5L14 8V2"/><path d="M7 15h10"/></>,
    calculator: <><rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/></>,
    paw: (
      <>
        <ellipse cx="12" cy="16" rx="6" ry="4" />
        <ellipse cx="5" cy="9" rx="2" ry="3" />
        <ellipse cx="10" cy="5" rx="2" ry="3" />
        <ellipse cx="16" cy="5" rx="2" ry="3" />
        <ellipse cx="20" cy="10" rx="2" ry="3" />
      </>
    ),
    fire: (
      <>
        <path d="M13 2c2 5-4 7-1 10 2-1 3-3 3-5 8 8 5 15-3 15S2 14 7 8c0 4 2 4 2 4-1-5 4-6 4-10Z" />
        <path d="M12 13c-5 5-2 8 1 7s4-3-1-7Z" fill="#ffe391" stroke="none" />
      </>
    ),
    star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" />,
    heart: <path d="M12 21 3 12C-3 3 7-1 12 5c5-6 15-2 9 7Z" />,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 5 5L20 6" />,
    book: (
      <>
        <path d="M12 5v16M2 3c5 0 7 0 10 2 3-2 5-2 10-2v16c-5 0-7 0-10 2-3-2-5-2-10-2Z" />
      </>
    ),
    gear: (
      <>
        <path d="m10 2 4 0 1 3 3 1 3 3-2 3 2 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 2-3-2-3 3-3 3-1Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    bulb: (
      <>
        <path d="M8 17c0-4-4-4-4-8a8 8 0 0 1 16 0c0 4-4 4-4 8Zm1 4h6" />
        <path d="m10 9 2 3 2-3" />
      </>
    ),
    bowl: (
      <>
        <path d="M2 11h20l-3 9H5Z" />
        <path d="M6 7c0-2 2-2 2-4m5 4c0-2 2-2 2-4" />
      </>
    ),
    erase: (
      <>
        <path d="m9 4-7 8 7 8h13V4Z" />
        <path d="m12 8 6 8m0-8-6 8" />
      </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    home: (
      <>
        <path d="m2 10 10-8 10 8M5 9v12h14V9M10 21v-7h4v7" />
      </>
    ),
  };
  const filled = ["paw", "fire", "star", "heart"].includes(name);
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
