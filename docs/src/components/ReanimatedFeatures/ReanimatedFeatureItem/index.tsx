import React from 'react';
import styles from './styles.module.css';

const ReanimatedFeatureItem: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <div className={styles.featureItem}>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
};

export default ReanimatedFeatureItem;
