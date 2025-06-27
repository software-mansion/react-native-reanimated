import React, { PropsWithChildren } from 'react';
import styles from './styles.module.css';
import QuoteIcon from './QuoteIcon';
import { useColorMode } from '@docusaurus/theme-common';

export interface TestimonialImageProps {
  alt: string;
  src: string;
}
interface Props extends PropsWithChildren {
  author: string;
  company?: string;
  link: string;
  image: TestimonialImageProps;
}

const TestimonialItem = ({ author, company, image, link, children }: Props) => {
  return (
    <a href={link} target="_blank" className={styles.testimonialItem}>
      <QuoteIcon
        className={styles.quoteIcon}
        color={
          useColorMode().colorMode === 'dark'
            ? 'var(--swm-off-white)'
            : 'var(--swm-red-light-100)'
        }
      />
      <div className={styles.testimonialAuthor}>
        <div className={styles.testimonialAuthorPhoto}>
          <img alt={image.alt} src={image.src} />
        </div>
        <div className={styles.testimonialAuthorInfo}>
          <h5 className={styles.testimonialAuthorName}>{author}</h5>
          <span className={styles.testimonialCompany}>{company}</span>
        </div>
      </div>
      <p className={styles.testimonialBody}>“{children}”</p>
    </a>
  );
};

export default TestimonialItem;
