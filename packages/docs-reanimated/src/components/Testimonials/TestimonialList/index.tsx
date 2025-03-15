import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';
import TestimonialItem from '@site/src/components/Testimonials/TestimonialItem';

const items = [
  {
    author: 'Marc Rousavy',
    company: 'Margelo',
    body: 'We’ve used Reanimated and Gesture Handler for a ton of apps already - it’s amazingly simple yet powerful! 😍',
    link: 'https://twitter.com/mrousavy/status/1754909520571019756',
    image: {
      alt: 'marc rousavy',
      src: 'https://pbs.twimg.com/profile_images/1713946397391667200/l-LXWNl2_400x400.jpg',
    },
  },
  {
    author: 'Andrew Lo',
    company: 'Shopify',
    body: 'They enable us app devs to make our users feel delight, have fun, and enjoy using our apps more.',
    link: 'https://twitter.com/alotoronto/status/1754905332709576823',
    image: {
      alt: 'andrew lo',
      src: 'https://pbs.twimg.com/profile_images/870388069819707393/WSdiZCDG_400x400.jpg',
    },
  },
  {
    author: 'Mo Gorhom',
    body: `Reanimated and Gesture Handler are the reason why I shifted my focus from native (objc&java) development to React Native 🖤.`,
    link: 'https://twitter.com/gorhom/status/1754974706782896465',
    image: {
      alt: 'mo gorhom',
      src: 'https://pbs.twimg.com/profile_images/1699071865996869632/R09iQ1T5_400x400.jpg',
    },
  },
  {
    author: 'Brandon Austin',
    body: `I’ve built dozens of apps, each and every one of them have used both Reanimated and Gesture Handler at different levels of complexity.`,
    link: 'https://twitter.com/bran_aust/status/1754907731536863670',
    image: {
      alt: 'brandon austin',
      src: 'https://pbs.twimg.com/profile_images/1886569538356977664/HSO3O8hT_400x400.jpg',
    },
  },
  {
    author: 'Syed Noman',
    body: `Reanimated is an amazing library!
    It made my apps smooth and engaging, boosting performance and user happiness. Highly recommend for any developer wanting to upgrade  their app.`,
    link: 'https://twitter.com/codewithnomi_/status/1754910812584436199',
    image: {
      alt: 'syed noman',
      src: 'https://pbs.twimg.com/profile_images/1830471268178546688/ZmDKS2cM_400x400.jpg',
    },
  },
  {
    author: 'Daniel Grychtol',
    company: 'TheWidlarzGroup',
    body: 'Simply - it’s pure joy to write animations with Reanimated now! Also, API that was introduced in V2 - imo game changer in terms of the learning curve (compared to API from V1) 💜.',
    link: 'https://twitter.com/daniel_mark01/status/1754925618494337459',
    image: {
      alt: 'daniel grychtol',
      src: 'https://pbs.twimg.com/profile_images/1602243131537235968/o6KWUmHw_400x400.jpg',
    },
  },
];

const TestimonialList = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      const testimonialContainer = document.querySelector<HTMLElement>(
        `.testimonialContainer-${activeIndex}`
      );
      const testimonialSlides =
        document.querySelector<HTMLElement>('.testimonialSlides');
      if (
        testimonialContainer.childElementCount === 1 &&
        testimonialSlides.offsetHeight > testimonialContainer.offsetHeight
      ) {
        return;
      }
      testimonialSlides.style.height = `${testimonialContainer.offsetHeight}px`;
    };

    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [activeIndex]);

  const handleDotClick = (index) => {
    setActiveIndex(index);
  };

  const renderedItems = [];
  for (let i = 0; i < items.length; i += 2) {
    renderedItems.push(
      <div
        className={clsx(
          `testimonialContainer-${i / 2}`,
          styles.testimonialPair
        )}
        key={i}>
        <TestimonialItem
          company={items[i].company}
          image={items[i].image}
          link={items[i].link}
          author={items[i].author}>
          {items[i].body}
        </TestimonialItem>
        {i + 1 < items.length && (
          <TestimonialItem
            company={items[i + 1].company}
            image={items[i + 1].image}
            link={items[i + 1].link}
            author={items[i + 1].author}>
            {items[i + 1].body}
          </TestimonialItem>
        )}
      </div>
    );
  }

  return (
    <div className={styles.testimonialSlides}>
      <div className="testimonialSlides">
        {renderedItems.map((item, idx) => (
          <div
            key={idx}
            className={clsx(
              styles.testimonialSlide,
              activeIndex === idx ? styles.activeTestimonialSlide : ''
            )}>
            {item}
          </div>
        ))}
      </div>
      <div className={styles.dotsContainer}>
        {renderedItems.map((_, idx) => (
          <span
            key={idx}
            className={clsx(
              styles.dot,
              idx === activeIndex && styles.activeDot
            )}
            onClick={() => handleDotClick(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default TestimonialList;
