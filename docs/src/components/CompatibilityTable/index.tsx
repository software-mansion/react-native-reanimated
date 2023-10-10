import React from 'react';
import { StyleSheet, View } from 'react-native';

export const CompatibilityTablePaper: React.FC = () => {
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
        <td>
          from <b>3.4.x</b> to <b>3.5.x</b>
        </td>
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
        <td>
          from <b>3.1.x</b> to <b>3.3.x</b>
        </td>
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
        <td>
          from <b>3.0.x</b> to <b>3.1.x</b>
        </td>
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
        <td>
          from <b>2.14.x</b> to <b>2.17.x</b>
        </td>
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
        <td>
          from <b>2.10.x</b> to <b>2.13.x</b>
        </td>
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
        <td>
          from <b>2.5.x</b> to <b>2.9.x</b>
        </td>
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
      </tr>
      <tr>
        <td>
          from <b>2.3.x</b> to <b>2.4.x</b>
        </td>
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
        <td>
          from <b>3.1.x</b> to <b>3.5.x</b>
        </td>
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
        <td>
          <b>3.0.x</b>
        </td>
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
