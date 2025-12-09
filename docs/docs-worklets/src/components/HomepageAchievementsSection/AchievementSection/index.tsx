import styles from './styles.module.css';

interface AchievementSectionProps {
  title: string;
  description: string;
  svg: React.ReactNode;
}

export default function AchievementSection({
  title,
  description,
  svg,
}: AchievementSectionProps): JSX.Element {
  return (
    <div className={styles.achievementSection}>
      {svg}
      <div className={styles.achievementSectionContent}>
        <h3>{title}</h3>
        <div>{description}</div>
      </div>
    </div>
  );
}
