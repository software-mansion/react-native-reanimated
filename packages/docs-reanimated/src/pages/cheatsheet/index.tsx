import React, { useState } from 'react';
import styles from './index.module.css';
import Layout from '@theme/Layout';

export default function CheatSheetPage(): JSX.Element {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.successMessage}>
            <h1>Thank you, {formData.name}!</h1>
            <p>
              Your Reanimated 4 cheat sheet is on its way to {formData.email}
            </p>
            <p>Check your inbox in the next few minutes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout description="A comprehensive cheat sheet for React Native Reanimated 4">
      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1>React Native Reanimated 4 – Cheat Sheet</h1>
            <p className={styles.subtitle}>
              The most useful React Native Reanimated 4 API overviews and code
              snippets in one place.
            </p>
            <p className={styles.subtitle}>
              Focus on writing animations, not searching the docs.
            </p>
          </header>

          <section className={styles.features}>
            <h2>What you'll find inside</h2>
            <ul className={styles.featureList}>
              <li>
                CSS animations for spinners, pulsing effects, and standalone UI
                animations
              </li>
              <li>
                CSS transitions for buttons, modals, or changing container
                colors
              </li>
              <li>
                Shared values for drag-and-drops, sliders, or gesture-driven
                interactions
              </li>
              <li>
                Layout animations for adding/removing list items or
                expanding/collapsing sections
              </li>
            </ul>
          </section>

          <section className={styles.signup}>
            <h2>Grab your copy</h2>
            <p>Enter your details to get the PDF in your inbox.</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Your name (required)</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Your email (required)</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>

              <p className={styles.disclaimer}>
                By providing your email address, you agree to receive our
                marketing emails and product updates. You can unsubscribe at any
                time.
              </p>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={
                  isSubmitting ||
                  !formData.name.trim() ||
                  !formData.email.trim()
                }>
                {isSubmitting ? 'Sending...' : 'Download the cheat sheet'}
              </button>
            </form>
          </section>

          <section className={styles.links}>
            <h2>Want more?</h2>
            <div className={styles.linkList}>
              <a
                href="https://docs.swmansion.com/react-native-reanimated/"
                target="_blank"
                className={styles.link}>
                Read the full docs →
              </a>
              <a
                href="https://x.com/swmansion"
                target="_blank"
                className={styles.link}>
                Follow Software Mansion on X →
              </a>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
