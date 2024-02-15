import React from 'react';
import styles from './styles.module.css';
import ReanimatedTestimonialList from '@site/src/components/ReanimatedTestimonials/ReanimtedTestimonialList';

const ReanimatedTestimonials = () => {
  return (
    <div className={styles.testimonialsContainer}>
      <h2 className={styles.title}>Testimonials</h2>
      <ReanimatedTestimonialList />
    </div>
  );
};

export default ReanimatedTestimonials;
