/* Culinary Masterminds — site-wide interactions */

(function () {
  // Year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Sticky header
  const header = document.getElementById('siteHeader');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 40) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  const toggle = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  // Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');
  if (lightbox && lightboxImg) {
    document.querySelectorAll('.gallery-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const src = item.getAttribute('data-img');
        if (!src) return;
        lightboxImg.src = src;
        lightboxImg.alt = item.querySelector('img')?.alt || '';
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
      });
    });
    const close = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.src = '';
    };
    lightboxClose.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
})();
