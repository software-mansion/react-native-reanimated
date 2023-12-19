import React from 'react';
import styles from './styles.module.css';

import NavbarSearch from '@theme/Navbar/Search';
import SearchBar from '@theme/SearchBar';

const AlgoliaSearchBar = () => {
  return (
    <div className={styles.navbarSearchWrapper}>
      <NavbarSearch className={styles.navbarSearch}>
        <SearchBar />
      </NavbarSearch>
    </div>
  );
};

export default AlgoliaSearchBar;
