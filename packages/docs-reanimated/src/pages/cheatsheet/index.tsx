import React, { useState, useRef } from 'react';
import styles from './index.module.css';
import Layout from '@theme/Layout';

const API_URL = 'https://swmansion.dev/api/reanimated-cheatsheet/signin';

export default function CheatSheetPage(): JSX.Element {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signupSectionRef = useRef<HTMLElement>(null);

  const scrollToForm = () => {
    if (signupSectionRef.current) {
      signupSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

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
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setError('Failed to submit form. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout description="A comprehensive cheat sheet for React Native Reanimated 4">
      <div className={styles.container}>
        <div className={styles.content}>
          <header className={styles.header}>
            <h1>Reanimated 4 – Cheat Sheet</h1>
            <p className={styles.subtitle}>
              The most useful React Native Reanimated 4 API overviews and code
              snippets in one place. Focus on writing animations, not searching
              the docs.
            </p>
            <div className={styles.buttonContainer}>
              <button onClick={scrollToForm} className={styles.button}>
                Download the cheat sheet
              </button>
            </div>
          </header>

          <section className={styles.features}>
            <h2>What you'll find inside</h2>
            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <div className={styles.spinner}></div>
                </div>
                <h3>CSS Animations</h3>
                <p>Spinners, pulsing effects, and standalone UI animations</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <div className={styles.transitionBox}></div>
                </div>
                <h3>CSS Transitions</h3>
                <p>Buttons, modals, or changing container colors</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <div className={styles.slider}>
                    <div className={styles.sliderThumb}></div>
                  </div>
                </div>
                <h3>Shared Values</h3>
                <p>Drag-and-drops, sliders, or gesture-driven interactions</p>
              </div>

              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <div className={styles.layoutContainer}>
                    <div className={styles.layoutItem}></div>
                    <div className={styles.layoutItem}></div>
                    <div className={styles.layoutItem}></div>
                  </div>
                </div>
                <h3>Layout Animations</h3>
                <p>
                  Adding/removing list items or expanding/collapsing sections
                </p>
              </div>
            </div>
          </section>

          {isSubmitted ? (
            <div className={styles.content}>
              <div className={styles.successMessage}>
                <h1>Thank you, {formData.name}!</h1>
                <p>
                  Your Reanimated 4 cheat sheet is on its way to{' '}
                  {formData.email}
                </p>
                <p>Check your inbox in the next few minutes.</p>
              </div>
            </div>
          ) : (
            <section ref={signupSectionRef} className={styles.signup}>
              <h2>Grab your copy</h2>
              <p>Enter your details to get the PDF in your inbox.</p>

              <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.errorMessage}>{error}</div>}

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
                  *By providing your email address, you agree to receive our
                  marketing emails and product updates. You can unsubscribe at
                  any time.
                </p>

                <button
                  type="submit"
                  className={styles.button}
                  disabled={
                    isSubmitting ||
                    !formData.name.trim() ||
                    !formData.email.trim()
                  }>
                  {isSubmitting ? 'Sending...' : 'Download the cheat sheet'}
                </button>
              </form>
            </section>
          )}

          <section className={styles.links}>
            <h2>Want more?</h2>
            <div className={styles.linkList}>
              <a
                href="/react-native-reanimated/docs/fundamentals/getting-started"
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
