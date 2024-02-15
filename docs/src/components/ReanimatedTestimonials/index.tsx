import React from 'react';
import styles from './styles.module.css';
import ReanimatedTestimonialList from '@site/src/components/ReanimatedTestimonials/ReanimatedTestimonialList';

const GestureTestimonals = () => {
  return (
    <div className={styles.testimonialsContainer}>
      <h2 className={styles.title}>Testimonials</h2>
      <ReanimatedTestimonialList />
    </div>
  );
};

export default GestureTestimonals;
