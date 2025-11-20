import "./App.css";
import ChatWidget from "./components/ChatWidget";

const SUGGESTIONS = [
  "Application Fees",
  "Processing Time",
  "Required Documents",
  "Interview Requirement",
];

function SparklesIcon() {
  return (
    <svg
      className="sparkles-icon"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 1l2.24 7.31L27 10.5l-6.76 4.18L18 22l-2.24-7.32L9 10.5l6.76-2.19L18 1zM6 17l1.5 4.9L12 23l-4.5 2.1L6 30l-1.5-4.9L0 23l4.5-1.1L6 17zm24 0l1.5 4.9L36 23l-4.5 2.1L30 30l-1.5-4.9L24 23l4.5-1.1L30 17z"
        fill="#1f1b2e"
        fillOpacity="0.8"
      />
    </svg>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="hero">
          <SparklesIcon />
          <h1>Nomadic Visa Assistant</h1>
        </header>
        <ChatWidget suggestions={SUGGESTIONS} />
      </div>
    </div>
  );
}

