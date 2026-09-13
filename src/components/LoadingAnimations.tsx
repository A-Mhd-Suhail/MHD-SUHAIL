import { useEffect } from 'react';
import gsap from 'gsap';

export default function LandingAnimations() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      // -------------------------
      // HERO ENTRANCE
      // -------------------------

      const tl = gsap.timeline({
        defaults: {
          ease: 'power3.out',
        },
      });

      tl.from('.hero-logo', {
        opacity: 0,
        y: -20,
        duration: 0.7,
      })
        .from(
          '.hero-content',
          {
            opacity: 0,
            y: 35,
            duration: 0.9,
          },
          '-=0.35'
        )
        .from(
          '.hero-card',
          {
            opacity: 0,
            x: 50,
            scale: 0.97,
            duration: 1,
          },
          '-=0.55'
        )
        .from(
          '.hero-button',
          {
            opacity: 0,
            y: 15,
            duration: 0.5,
          },
          '-=0.4'
        );

      // -------------------------
      // FLOATING AI CARD
      // -------------------------

      gsap.to('.hero-card', {
        y: -8,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // -------------------------
      // GLOWING ELEMENTS
      // -------------------------

      gsap.to('.ambient-glow', {
        opacity: 0.7,
        scale: 1.08,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      // -------------------------
      // CARDS
      // -------------------------

      gsap.utils.toArray<HTMLElement>('.feature-card').forEach(
        (card, index) => {
          gsap.from(card, {
            opacity: 0,
            y: 30,
            duration: 0.7,
            delay: index * 0.1,
            ease: 'power3.out',
            scrollTrigger: undefined,
          });
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return null;
}