import React from 'react';
import { StyleSheet, View } from 'react-native';

export const CompatibilityTablePaper: React.FC<> = () => {
  return (
    <table>
      <tr>
        <th></th>
        <th>0.62</th>
        <th>0.63</th>
        <th>0.64</th>
        <th>0.65</th>
        <th>0.66</th>
        <th>0.67</th>
        <th>0.68</th>
        <th>0.69</th>
        <th>0.70</th>
        <th>0.71</th>
        <th>0.72</th>
      </tr>
      <tr>
        <td>from 3.4.x to 3.5.x</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
      </tr>
      <tr>
        <td>from 3.1.x to 3.3.x</td>
        <td></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
      </tr>
      <tr>
        <td>from 3.0.x to 3.1.x</td>
        <td></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td></td>
      </tr>
      <tr>
        <td>from 2.10.x to 2.17.x</td>
        <td></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>from 2.5.x to 2.9.x</td>
        <td></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>{' '}
      <tr>
        <td>from 2.3.x to 2.4.x</td>
        <td></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td style={styles.supported}></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </table>
  );
};

export const CompatibilityTableFabric: React.FC<{
  label: string;
  labelCollapsed: string;
  collapsed: boolean;
  onCollapse: () => void;
  className?: string;
}> = ({ label, labelCollapsed, collapsed, onCollapse, className }) => {
  return (
    <table>
      <tr>
        <th></th>
        <th>0.62</th>
        <th>0.63</th>
        <th>0.64</th>
        <th>0.65</th>
        <th>0.66</th>
        <th>0.67</th>
        <th>0.68</th>
        <th>0.69</th>
        <th>0.70</th>
        <th>0.71</th>
        <th>0.72</th>
      </tr>
      <tr>
        <td>from 3.1.x to 3.5.x</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style={styles.supported}></td>
      </tr>
      <tr>
        <td>3.0.x</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td style={styles.supported}></td>
        <td></td>
      </tr>
    </table>
  );
};

const styles = StyleSheet.create({
  supported: {
    backgroundColor: '#3fc684', // var("--swm-green-dark-100")
  },
});
