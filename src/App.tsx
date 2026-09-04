import { useState } from "react";
import { caseStudies } from "./cases";

export default function App() {
  const [active, setActive] = useState(0);
  const { Component } = caseStudies[active];

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <span className="brand-course">MTH 160X</span>
          <span className="brand-sub">Case studies</span>
        </div>
        <ul>
          {caseStudies.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={i === active ? "is-active" : ""}
                aria-current={i === active ? "page" : undefined}
                onClick={() => setActive(i)}
              >
                <span className="nav-title">{c.title}</span>
                <span className="nav-module">{c.module}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="content">
        <Component />
      </main>
    </div>
  );
}
