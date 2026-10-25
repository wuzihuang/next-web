import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import DitherHero from "./DitherHero";
import {HERO_ENTRANCE} from "./dither/intro";
import {HeroExplore} from "./HeroExplore";
import "./landing.css";
import "./site.css";

/** The hero from the NextBody-Website handoff (c9c91344), without the router. */
function Hero() {
  return (
    <section className="lp-hero lp-hero-terminal" aria-label="HOOP" data-intro="pending">
      <div className="lp-hero-terminal-bg" aria-hidden="true">
        <DitherHero intro />
      </div>
      <div className="lp-hero-scrim" aria-hidden="true" />
      <h1 className="lp-hero-intro-title">{HERO_ENTRANCE.title}</h1>
      <div className="lp-hero-terminal-content">
        <HeroExplore />
      </div>
    </section>
  );
}

const mount = document.getElementById("nb-hero");
if (mount) {
  createRoot(mount).render(
    <StrictMode>
      <Hero />
    </StrictMode>,
  );
}
