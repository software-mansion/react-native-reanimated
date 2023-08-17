import React from 'react';
import SearchBar from '@theme-original/SearchBar';
import styles from './styles.module.css';

export default function SearchBarWrapper(props) {
  return (
    <>
      <SearchBar {...props} />
    </>
  );
}
