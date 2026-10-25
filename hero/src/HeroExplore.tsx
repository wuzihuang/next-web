import {useEffect, useRef, type MouseEvent} from 'react';
import {LandingArrow} from './LandingArrow';

/** Shows the product page under the hero; the first visit shows only the hero. */
function revealProduct() {
  const product = document.getElementById('product');
  if (!product?.hidden) return;
  product.hidden = false;
  // The scrollbar appears and changes the width the artboards scale to.
  window.dispatchEvent(new Event('resize'));
}

export function HeroExplore() {
  const link = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  function signal(active: boolean, departing = false) {
    link.current
      ?.closest('section')
      ?.dispatchEvent(
        new CustomEvent('hero-explore', {detail: {active, departing}}),
      );
  }
  function move(event: MouseEvent<HTMLAnchorElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      '--core-x',
      `${(event.clientX - rect.left - rect.width / 2) * 0.12}px`,
    );
    event.currentTarget.style.setProperty(
      '--core-y',
      `${(event.clientY - rect.top - rect.height / 2) * 0.18}px`,
    );
  }
  function leave() {
    link.current?.style.setProperty('--core-x', '0px');
    link.current?.style.setProperty('--core-y', '0px');
    signal(document.activeElement === link.current);
  }
  function enter(event: MouseEvent<HTMLAnchorElement>) {
    revealProduct();
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    if (timer.current) return;
    const hero = event.currentTarget.closest('section');
    if (!hero) return;
    const rect = event.currentTarget.getBoundingClientRect();
    (hero as HTMLElement).style.setProperty(
      '--exit-x',
      `${rect.left + rect.width / 2}px`,
    );
    (hero as HTMLElement).style.setProperty(
      '--exit-y',
      `${rect.top + rect.height / 2}px`,
    );
    hero.setAttribute('data-departing', 'true');
    signal(true, true);
    timer.current = setTimeout(() => {
      // The product page sits below the hero on the same page: clear the exit
      // overlay first, then scroll. scrollIntoView() without options works in
      // every browser and honours the header's scroll-margin.
      timer.current = undefined;
      hero.removeAttribute('data-departing');
      signal(false);
      document.getElementById('band')?.scrollIntoView();
    }, 650);
  }

  return (
    <>
      <a
        ref={link}
        href="#band"
        className="hero-explore"
        onMouseEnter={() => signal(true)}
        onMouseMove={move}
        onMouseLeave={leave}
        onFocus={() => signal(true)}
        onBlur={() => signal(false)}
        onClick={enter}
      >
        <svg
          className="hero-explore-outline"
          viewBox="0 0 320 72"
          fill="none"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="318" height="70" rx="35" pathLength="1" />
        </svg>
        <span className="hero-explore-core" aria-hidden="true" />
        <span className="hero-explore-label">EXPLORE</span>
        <LandingArrow />
      </a>
      <div className="hero-explore-exit" aria-hidden="true" />
    </>
  );
}
