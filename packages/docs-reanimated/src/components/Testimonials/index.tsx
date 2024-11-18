import React from 'react';
import styles from './styles.module.css';
import TestimonialList from '@site/src/components/Testimonials/TestimonialList';

const Testimonals = () => {
  return (
    <div className={styles.testimonialsContainer}>
      <h2 className={styles.title}>Testimonials</h2>
      <TestimonialList />
    </div>
  );
};

export default Testimonals;
