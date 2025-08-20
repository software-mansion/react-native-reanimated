import LinkIcon from '@site/static/img/link-icon.svg';
import PhoneImage from '@site/static/img/phone.png';

import styles from './styles.module.css';

interface UseCaseProps {
  title: string;
  url: string;
  description: string;
}

export default function UseCase({
  title,
  url,
  description,
}: UseCaseProps): JSX.Element {
  return (
    <div className={styles.useCase}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <a href={url} target="_blank" rel="noreferrer">
          <div className={styles.link}>
            <LinkIcon />
          </div>
        </a>
      </div>
      <div className={styles.content}>
        <img src={PhoneImage} alt="Phone" />
      </div>
      <div className={styles.description}>{description}</div>
    </div>
  );
}
