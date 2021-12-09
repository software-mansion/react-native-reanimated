import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const heroImageUrl = 'img/swm-react-native-reanimated-illu-top-05.svg';
const sectionImageUrl = 'img/swm-react-native-reanimated-illu-kon-06.svg';
const screenshotUrl = 'img/3.gif';

const boxes = [
  {
    title: <>Animate with more ease than ever before</>,
    description: (
      <>
        Complexity reduced from tens to just a few methods. Try it out today:
        Check out our <a href="docs/">Documentation</a>.
      </>
    ),
  },
  {
    title: <>Native Performance and Precise Animations</>,
    description: (
      <>
        Declare your animations in JS, but have them run on the native thread!
        🧙 The API affords new levels of precision and detailed control of your
        animations. 🕹
      </>
    ),
  },
];

const bannerTitle =
  'React Native Gesture Handler provides native-driven gesture management APIs for building best possible touch-based experiences in React Native.';
const bannerDescription =
  'eact Native Reanimated provides a more comprehensive, low level abstraction for the Animated library API to be built on top of and hence allow for much greater flexibility especially when it comes to gesture based interactions.';
const blogUrl =
  'https://blog.swmansion.com/introducing-reanimated-2-752b913af8b3';
const exampleUrl =
  'https://github.com/software-mansion/react-native-reanimated/tree/main/Example';
const playgroundUrl =
  'https://github.com/software-mansion-labs/reanimated-2-playground';
const tryItOutDecription =
  'Check out the documentation and learn how to quickly get up and running with Reanimated. Take a look at our API guides to familiarize with the API.';

function InfoBox({ title, description }) {
  return (
    <div className="col col--6 info-box">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Hero() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;

  return (
    <header className={classnames('hero hero--secondary', styles.heroBanner)}>
      <div className="container">
        <div className="row row-hero">
          <div className="col col--5 hero-content">
            <h1 className="hero__title">{siteConfig.title}</h1>
            <p className="hero__p">{siteConfig.tagline}</p>
            <div className={classnames('hero-buttons', styles.buttons)}>
              <Link
                className={classnames(
                  'button button--primary button--lg',
                  styles.getStarted
                )}
                to={useBaseUrl('docs')}>
                View Docs
              </Link>
              <Link
                className={classnames(
                  'button button--primary button--lg',
                  styles.getStarted
                )}
                to={blogUrl}>
                Read Blog Post
              </Link>
            </div>
          </div>
          <div
            className="col col--7 hero-image"
            style={{
              backgroundImage: `url(${heroImageUrl})`,
            }}></div>
        </div>
      </div>
    </header>
  );
}
function SectionImage() {
  return (
    <div
      className="col col--4 section-image"
      style={{
        backgroundImage: `url(${sectionImageUrl})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}></div>
  );
}

function SectionBoxes() {
  return (
    <div className="col col--8 section-boxes">
      {boxes && boxes.length > 0 && (
        <div className="row box-container">
          {boxes.map((props, idx) => (
            <InfoBox key={idx} {...props} />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerSection() {
  return (
    <section>
      <div className="container">
        <div className="row">
          <div
            className="col col--4 section-image"
            style={{
              backgroundImage: `url(${sectionImageUrl})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            }}></div>
          <div className="col col--8">
            <h1>{bannerTitle}</h1>
            <p className="hero__p">{bannerDescription}</p>
            <div className={classnames('hero-buttons', styles.buttons)}>
              <Link
                className={classnames(
                  'button button--primary button--lg',
                  styles.getStarted
                )}
                to={useBaseUrl('docs/installation')}>
                Getting Started Guide
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;

  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <Hero />

      <main>
        <section>
          <div className="container">
            <div className="row row--box-section">
              <SectionBoxes />
              <SectionImage />
            </div>
          </div>
        </section>
        {/* <BannerSection /> */}
        <section>
          <div className="container container--center">
            <div className="row row--center">
              <div className="col col--7 text--center col--bottom-section">
                <h2>Try it out</h2>
                <p>{tryItOutDecription}</p>
                <div className="item screenshot-container">
                  <img src={screenshotUrl} alt="Reanimated screenshot" />
                </div>
                <div>
                  <Link
                    className={classnames(
                      'button button--primary button--lg',
                      styles.getStarted
                    )}
                    to={exampleUrl}>
                    Example on GitHub
                  </Link>

                  <Link
                    className={classnames(
                      'button button--primary button--lg',
                      styles.getStarted
                    )}
                    to={playgroundUrl}>
                    Playground App
                  </Link>
                </div>
                <p>
                  Or just go to{' '}
                  <a href="docs/fundamentals/installation">
                    Documentation page
                  </a>{' '}
                  to see how you can run it locally with React Native on both
                  Android and iOS.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="container">
            <div className="row row--center">
              <div className="col col--7 text--center col--bottom-section">
                <h2>Sponsors</h2>
                <p>
                  We really appreciate our sponsors! Thanks to them we can
                  develop our library and make the react-native world a better
                  place. Special thanks for:
                </p>
                <div className="row row--center">
                  <div style={{ 'margin-right': '40px' }}>
                    <a href="https://www.shopify.com/">
                      <img
                        class="imageHolder-sponsor"
                        src="https://avatars1.githubusercontent.com/u/8085?v=3&s=100"
                      />
                    </a>
                    <h6>Shopify</h6>
                  </div>
                  <div>
                    <a href="https://expo.dev">
                      <img
                        class="imageHolder-sponsor"
                        src="https://avatars2.githubusercontent.com/u/12504344?v=3&s=100"
                      />
                    </a>
                    <h6>Expo</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

export default Home;
