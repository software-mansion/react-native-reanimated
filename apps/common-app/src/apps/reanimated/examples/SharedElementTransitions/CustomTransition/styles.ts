import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  section: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#f4f4f4',
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  greenBoxSource: {
    width: 100,
    height: 100,
    marginVertical: 12,
    backgroundColor: 'green',
  },
  greenBoxTarget: {
    width: 200,
    height: 300,
    marginLeft: 60,
    marginTop: 100,
    backgroundColor: 'green',
  },
});
