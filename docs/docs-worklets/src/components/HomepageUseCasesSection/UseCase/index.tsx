import LinkIcon from '@site/static/img/link-icon.svg';
import PhoneImage from '@site/static/img/phone.png';

import styles from './styles.module.css';

interface UseCaseProps {
  title: string;
  url: string;
  description: string;
  mp4: string;
}

export default function UseCase({
  title,
  url,
  description,
  mp4,
}: UseCaseProps): JSX.Element {
  return (
    <div className={styles.useCase}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <a href={url} target="_blank" rel="noreferrer">
          <div className={styles.link}>
            <LinkIcon />
          </div>
        </a>
      </div>
      <div className={styles.content}>
        <div className={styles.phone}>
          <img src={PhoneImage} alt="Phone" />
        </div>
        <video className={styles.video} src={mp4} autoPlay muted loop />
      </div>
      <div className={styles.description}>{description}</div>
    </div>
  );
}
