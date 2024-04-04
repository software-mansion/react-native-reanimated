---
id: sectionlist
title: Section List
---

import SectionList from '@site/static/examples/SectionList';
import SectionListSrc from '!!raw-loader!@site/static/examples/SectionList';

Section Lists are essential in mobile app development, organizing content with sleek headers and intuitive navigation for seamless user experience. They streamline browsing through news categories or recipe collections, offering effortless scrolling and clear organization, making content discovery a delightful journey.

<InteractiveExample src={SectionListSrc} component={<SectionList />} />

The primary component, **SectionList**, acts as the main orchestrator of the entire Section List interface. It coordinates the rendering of the table of contents and individual content sections.

<samp id="SectionList">Section List</samp>

```js
const SectionList = () => {
  /*
  /* content
  */
  return (
    <View style={sectionListStyles.cardsContainer}>
      <TableOfContents
        selectedItem={selectedItem}
        data={sectionNames}
        visibleIndex={visibleIndex}
        sectionCardsRef={sectionCardsRef}
        tableOfContentsRef={tableOfContentsRef}
      />
      <SectionCards
        sections={SECTIONS}
        visibleIndex={visibleIndex}
        tableOfContentsRef={tableOfContentsRef}
        sectionCardsRef={sectionCardsRef}
      />
    </View>
  );
};
```

Within **SectionList**, there are two key components: **TableOfContents** and **SectionCards**.

**TableOfContents** is responsible for rendering the list of section names as a table of contents. It receives props such as `data`, `visibleIndex`, `sectionCardsRef`, and `tableOfContentsRef` to manage navigation and synchronization between the table of contents and section content.

<samp id="SectionList">Section List</samp>

```js
const TableOfContents = ({
  data,
  visibleIndex,
  sectionCardsRef,
  tableOfContentsRef,
}) => {
  return (
    <View style={sectionListStyles.tableOfContents}>
      <FlashList
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TableOfContentsElement
            item={item}
            visibleIndex={visibleIndex}
            index={index}
            sectionCardsRef={sectionCardsRef}
          />
        )}
        data={data}
        estimatedItemSize={52}
        ref={tableOfContentsRef}
      />
    </View>
  );
};
```

**SectionCards**, on the other hand, manages the rendering of individual sections and their corresponding content. It receives props such as `sections`, `visibleIndex`, `sectionCardsRef`, and `tableOfContentsRef` to render the content sections and handle scrolling interactions.

<samp id="SectionList">Section List</samp>

```js
const SectionCards = ({
  sections,
  visibleIndex,
  sectionCardsRef,
  tableOfContentsRef,
}) => {
  /*
  /* content 
  */
  const renderItem = ({ item }) => {
    return (
      <View>
        <Text style={sectionCardStyles.header}> {item.name}</Text>
        <SectionCardsElement>
          <Text style={sectionCardStyles.content}>{item.content}</Text>
        </SectionCardsElement>
      </View>
    );
  };

  return (
    <View style={sectionListStyles.flex}>
      <FlashList
        ref={sectionCardsRef}
        estimatedFirstItemOffset={0}
        renderItem={renderItem}
        data={sections}
        onScrollBeginDrag={onScroll}
        onScrollEndDrag={onScroll}
        onScroll={debounce(onScroll)}
        onMomentumScrollBegin={onScroll}
        onMomentumScrollEnd={onScroll}
      />
    </View>
  );
};
```

The `onScroll` in **SectionCards** calculates the offset as the user scrolls through the content and determines which section is currently most visible on the screen. It is done by comparing the distance of each section from the top of the screen - it identifies the section closest to the viewport's top edge.

```js
const heights = sections.map((_) => SECTION_HEIGHT);

const getOffsetStarts = () =>
  heights.map((v, i) => heights.slice(0, i).reduce((x, acc) => x + acc, 0));

const onScroll = (event) => {
  const offset = event.nativeEvent.contentOffset.y;

  const distancesFromTop = getOffsetStarts().map((v) => Math.abs(v - offset));
  const newIndex = distancesFromTop.indexOf(
    Math.min.apply(null, distancesFromTop)
  );
  if (visibleIndex.value !== newIndex) {
    tableOfContentsRef.current?.scrollToIndex({
      index: newIndex,
      animated: true,
    });
  }
  visibleIndex.value = newIndex;
};
```

The `useSharedValue` hook is utilized to create shared mutable values across different components. For instance, `selectedItem` and `visibleIndex` are [shared values](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value) used to manage the currently selected section and its visibility index.

```js
const selectedItem = useSharedValue('');
const visibleIndex = useSharedValue(0);
```

Additionally, `useAnimatedStyle` is employed to define [animated styles](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/) based on the shared values. These animated styles are then applied to components to create dynamic visual effects, such as changing font weights and adding bottom borders.

```js
useAnimatedStyle(() => ({
  fontWeight: selectedItem.value === item ? 600 : 400,
  borderBottomWidth: selectedItem.value === item ? '1px' : '0',
}));
```

To enable interaction with the FlashList component - such as scrolling to specific sections, the code utilizes variables created using `useRef` such as `sectionCardsRef` and `tableContentsRef`

```js
const sectionCardsRef = useRef(null);
const tableOfContentsRef = useRef(null);
```

Reducing the frequency of calls and by this enhancing performance was done by implementation of the `debounce` function to throttle the `onScroll` event handler.

```js
function debounce(func, timeout = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}
```
