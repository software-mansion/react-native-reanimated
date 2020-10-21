import { StyleSheet } from 'react-native';

const s = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'black',
  },
  itemContainer: {
    backgroundColor: 'white',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
  },
  itemText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  itemPager: {},
  row: {
    flexDirection: 'row',
  },
  icon: {
    height: 28,
    width: 28,
    marginRight: 12,
  },
  iconBookmark: {
    height: 28,
    width: 28,
  },
  image: {
    height: 32,
    width: 32,
    borderRadius: 16,
  },
  footerItem: {
    zIndex: -1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 12,
  },
  paginationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -28,
    zIndex: -1,
  },
});

export default s;
