interface BookWorldArtProps {
  className?: string;
}

// Decorative open-book + orbit illustration used behind auth prompts. Pure
// background art (no interactive content), so no pointer-events concerns.
const BookWorldArt = ({ className = "" }: BookWorldArtProps) => (
  <svg
    viewBox="0 0 200 160"
    fill="none"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="102" cy="82" r="58" fill="white" fillOpacity="0.05" />

    {/* orbit ring around the book, evoking "stories from around the world" */}
    <ellipse
      cx="102"
      cy="82"
      rx="62"
      ry="26"
      stroke="white"
      strokeOpacity="0.28"
      strokeWidth="1.5"
    />
    <circle cx="102" cy="82" r="30" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" />

    {/* open book */}
    <path
      d="M102 66 C90 58 72 55 60 58 L60 102 C72 99 90 102 102 110 Z"
      fill="white"
      fillOpacity="0.22"
    />
    <path
      d="M102 66 C114 58 132 55 144 58 L144 102 C132 99 114 102 102 110 Z"
      fill="white"
      fillOpacity="0.22"
    />
    <path d="M102 66 L102 110" stroke="white" strokeOpacity="0.4" strokeWidth="1.5" />

    <path d="M67 66 L96 70" stroke="white" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
    <path d="M67 75 L93 79" stroke="white" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" />
    <path d="M67 84 L96 88" stroke="white" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
    <path d="M67 93 L90 97" stroke="white" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" />

    <path d="M108 70 L137 66" stroke="white" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
    <path d="M111 79 L137 75" stroke="white" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" />
    <path d="M108 88 L137 84" stroke="white" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
    <path d="M114 97 L137 93" stroke="white" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" />

    {/* sparkle accents in the brand accent color */}
    <path
      d="M158 32 L161.5 41 L170 44.5 L161.5 48 L158 57 L154.5 48 L146 44.5 L154.5 41 Z"
      fill="hsl(var(--primary))"
      fillOpacity="0.95"
    />
    <path
      d="M40 108 L42.5 114 L48.5 116.5 L42.5 119 L40 125 L37.5 119 L31.5 116.5 L37.5 114 Z"
      fill="hsl(var(--primary))"
      fillOpacity="0.85"
    />
    <circle cx="34" cy="46" r="3.5" fill="white" fillOpacity="0.55" />
    <circle cx="168" cy="112" r="3" fill="white" fillOpacity="0.45" />
  </svg>
);

export default BookWorldArt;
