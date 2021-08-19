import React from 'react';

import styles from './styles.module.css';
import clsx from 'clsx';

const TutorialStep = ({children, stepNumber}) => {
    console.log(children);
    return <div className={clsx(styles.container)}>
        <div className={clsx(styles.description)}>
            <div className={clsx(styles.roundedStep)}>
                <div className={clsx(styles.stepTitle)}>
                    Step {stepNumber}
                </div>
                 {children[0]}
            </div>
        </div>
        <div className={clsx(styles.code)}>
            {children[1]}
        </div>
    </div>
}

export default TutorialStep;