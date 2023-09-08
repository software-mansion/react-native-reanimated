import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';

export default function ArticleProgressExample() {
  const scrollViewRef = useAnimatedRef<Animated.ScrollView>();
  const textRef = useAnimatedRef<Animated.Text>();
  const scrollHandler = useScrollViewOffset(scrollViewRef);

  const progressBarAnimatedStyle = useAnimatedStyle(() => {
    const measuredText = measure(textRef);
    if (measuredText === null) {
      return { width: 0 };
    }

    const measuredScroll = measure(scrollViewRef);
    if (measuredScroll === null) {
      return { width: 0 };
    }

    const maxOffset = measuredText.height - measuredScroll.height;

    // We need this, because the useScrollViewOffset hook reports the offset of
    // the top of the view.
    const scrollViewHeightOffset =
      (measuredScroll.height / maxOffset) * scrollHandler.value;

    const width = Math.max(
      ((scrollHandler.value + scrollViewHeightOffset) / measuredText.height) *
        measuredScroll.width,
      0
    );

    return { width: Number.isNaN(width) ? 0 : width };
  }, []);

  return (
    <SafeAreaView>
      <Animated.View style={[styles.progressBar, progressBarAnimatedStyle]} />
      <Animated.ScrollView ref={scrollViewRef} style={styles.articleScrollView}>
        <Animated.Text ref={textRef}>{loremIpsum}</Animated.Text>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  progressBar: {
    backgroundColor: 'red',
    height: 5,
  },
  articleScrollView: {
    padding: 16,
  },
});

const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque sit amet ultrices nisl. Sed aliquam vel justo ut maximus. Ut lacinia odio id metus pulvinar, sed imperdiet risus tincidunt. Pellentesque dapibus rutrum metus nec consequat. Nunc ligula turpis, aliquet quis feugiat eu, aliquet ut metus. Maecenas et pellentesque massa, tempor bibendum eros. Duis tempus, mi nec consectetur tempor, mauris nibh volutpat turpis, eu dictum nunc ipsum et lectus. Duis dictum, urna eget imperdiet ullamcorper, urna orci posuere magna, vel consectetur ipsum urna id urna. Vestibulum mollis ex rutrum pulvinar mollis. Morbi vitae dictum velit. Mauris congue nibh at egestas aliquam. Morbi et odio at ligula ullamcorper pellentesque.

In volutpat lacus gravida faucibus ultricies. Etiam nibh sem, tincidunt in ipsum non, volutpat ultrices tortor. Fusce vitae velit lorem. Aliquam ut consectetur sapien. Donec tempus placerat vehicula. Nulla sit amet nisi vitae lacus aliquet pulvinar. Integer at magna posuere, placerat justo ac, rutrum nisl. Fusce tortor enim, laoreet in ligula sit amet, tristique tincidunt arcu. Integer quis libero malesuada, facilisis lorem eu, volutpat metus.

In non eleifend lectus. Nunc sagittis felis a hendrerit cursus. Nulla malesuada malesuada leo in scelerisque. Mauris tempor ligula et mattis viverra. Etiam magna ligula, ultrices eget venenatis non, eleifend sed mauris. Integer nec facilisis ipsum. Nam interdum augue feugiat dapibus pharetra. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Cras pellentesque, felis at tempus interdum, ex massa malesuada purus, at placerat libero risus eget elit. Curabitur efficitur convallis mauris ut aliquet. Donec dui augue, volutpat eget euismod euismod, consequat nec nunc. Fusce porttitor malesuada mattis. Proin tincidunt nulla efficitur sapien efficitur finibus.

Praesent et maximus purus. Pellentesque rutrum blandit mauris, a mattis metus consequat nec. Sed non ante commodo, lacinia turpis a, fringilla elit. Phasellus eget viverra diam, id maximus mi. Suspendisse mattis orci vitae lacus venenatis tincidunt. Donec nec fringilla ex. Suspendisse sed est eu nunc porttitor ullamcorper. Fusce ut enim lacus. Praesent ultrices erat vel elementum rhoncus. Etiam tristique est sollicitudin lectus finibus hendrerit.

Maecenas hendrerit augue non ullamcorper pharetra. Integer quis dui sed ligula euismod aliquet. Curabitur et consequat metus. Sed mattis lorem ut iaculis porttitor. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Mauris quis eros mollis, feugiat ante id, porta augue. Duis cursus efficitur dapibus. Vestibulum porttitor ultrices tincidunt. Aenean at arcu sagittis, vestibulum nibh et, venenatis lacus. Pellentesque aliquam placerat massa, a ultrices felis fringilla non.

Curabitur pretium suscipit dignissim. Ut sollicitudin pulvinar eros, lacinia consequat arcu vestibulum quis. Vivamus malesuada rhoncus quam, et aliquet mi efficitur sit amet. Praesent sollicitudin sodales fermentum. Integer at efficitur justo. Curabitur interdum nisi dolor, id rutrum sem pretium eget. Curabitur sem leo, elementum id erat non, efficitur lobortis dui. Nam egestas a felis a scelerisque. Fusce eget leo elit. Integer malesuada imperdiet nisl, sit amet congue urna malesuada at. Aliquam id dolor nulla. Sed eleifend, risus eu commodo feugiat, purus ante mattis sapien, et consectetur massa odio sit amet erat. Curabitur egestas eget odio a rutrum.

Proin egestas dapibus pharetra. Morbi pharetra, erat eu lobortis pulvinar, sapien tortor pretium magna, a iaculis enim erat eget elit. In in velit iaculis, efficitur nunc id, varius mauris. Curabitur scelerisque, orci id ornare rutrum, neque urna ullamcorper ipsum, eget dapibus neque odio in lorem. Mauris gravida mi et venenatis hendrerit. Suspendisse vitae felis blandit, viverra nisl id, auctor libero. Nulla odio ex, aliquet et magna sed, porta porta justo. Ut convallis pharetra erat, non pharetra leo fringilla at. Maecenas ultricies in justo at blandit. Vestibulum rutrum risus at venenatis pretium. Pellentesque id tempus leo, vitae convallis elit. Donec at libero scelerisque, fermentum nulla vitae, sollicitudin metus. Aliquam erat volutpat. Vivamus sagittis turpis a neque aliquet, quis vestibulum ligula hendrerit. Phasellus consequat purus leo, at tristique lectus tristique sit amet.

Pellentesque laoreet pretium congue. In quis imperdiet erat. Nulla tincidunt nibh dui, et laoreet nisi ullamcorper vel. In hac habitasse platea dictumst. Nulla gravida in urna vitae commodo. In sed eros felis. In luctus nibh eu magna vestibulum pulvinar eu porttitor felis. Nulla condimentum a lorem sed consequat.

Nunc vitae pretium turpis. Quisque vehicula aliquet pharetra. Vestibulum ac gravida turpis. Etiam quis ligula egestas, aliquet erat at, gravida nunc. Morbi dolor justo, posuere quis mattis ut, dictum non felis. Proin euismod vulputate sagittis. Ut tempus ullamcorper feugiat. Maecenas ultrices nunc tempus elit luctus, eu venenatis tellus malesuada. Praesent vehicula a lectus sed vehicula. Nulla pretium elit vel enim tristique auctor. Pellentesque arcu tellus, dignissim pharetra feugiat sit amet, mollis sit amet mauris. Etiam lobortis tincidunt ligula condimentum vulputate.

Nulla ut tincidunt sem, ac ornare lacus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse potenti. Vivamus faucibus lectus ante, eu maximus lectus dapibus vitae. Fusce porttitor, enim vitae venenatis gravida, tortor felis congue nunc, et mattis tortor ipsum id augue. Integer et diam sapien. Curabitur eget eros eu tellus dictum fermentum. In mollis at tellus et facilisis. Duis tristique augue et justo pulvinar, at accumsan lorem convallis. Cras ultrices odio quis nisi vestibulum commodo. Pellentesque consequat nunc sit amet augue efficitur porttitor. Sed turpis velit, volutpat non velit ac, pellentesque pretium ex. Maecenas ut mauris vitae ligula ullamcorper rutrum volutpat sit amet dolor.

Nullam congue fringilla mattis. In posuere posuere imperdiet. Fusce id urna tortor. Pellentesque quis tortor in felis dictum aliquet a sit amet lorem. Etiam sodales libero sit amet iaculis ullamcorper. Suspendisse maximus, neque sit amet ultrices venenatis, elit urna rhoncus ex, eget efficitur quam eros in magna. Maecenas sit amet arcu semper, vestibulum velit vel, pretium arcu. Pellentesque eu libero ligula. Vestibulum auctor est erat, et mollis erat bibendum ac. Sed aliquam sagittis nisi vitae convallis. Duis euismod id mi eu interdum. Duis hendrerit convallis augue non fringilla. Nulla facilisi. Quisque mauris ex, ultrices eget tellus eu, tristique elementum sem. Etiam ornare augue elit, vitae faucibus purus fringilla vel.

Vestibulum porttitor varius eleifend. Nullam convallis libero justo, sit amet vehicula leo scelerisque ac. Integer suscipit nulla et efficitur vulputate. Vestibulum in commodo elit, ultricies laoreet ipsum. Morbi congue ante eu risus aliquet pharetra. Nam cursus aliquet est. Donec malesuada, purus quis placerat tincidunt, velit nisi finibus quam, vitae imperdiet ipsum nibh dictum nunc. Donec ut purus nunc. Fusce lobortis ornare vestibulum. Mauris at quam in purus rutrum viverra. Vivamus egestas purus eu eros lobortis, et efficitur erat scelerisque. Sed ultricies sem a tellus tempus cursus. Sed tempor rutrum orci id varius. Morbi ultricies porta tempus.

Praesent hendrerit est nunc. Curabitur libero velit, elementum sit amet rhoncus a, blandit quis tortor. Aenean in aliquet erat, sit amet aliquet ante. Aliquam erat volutpat. Mauris ultricies erat ut felis fringilla, mattis suscipit ex mattis. Duis et ipsum eget magna sagittis accumsan ut ut lacus. Duis a justo fringilla, consequat nunc eu, placerat diam. Aliquam consectetur viverra tellus eget laoreet. Pellentesque semper purus libero, et convallis massa pretium consequat. Vivamus interdum arcu dui. Cras felis diam, facilisis ut neque at, tincidunt viverra purus. Mauris consectetur quis nulla ut iaculis. Ut sit amet pellentesque nunc. Aenean nunc ligula, sollicitudin sed orci sed, cursus malesuada tortor. Vestibulum in purus sollicitudin ligula pharetra auctor.

Praesent at metus malesuada, pretium orci eget, gravida lacus. Morbi lacus tellus, porttitor eu mattis vitae, auctor eget turpis. Vivamus ullamcorper ipsum id purus sodales, id interdum erat hendrerit. Nam at sollicitudin lorem, ac consectetur quam. Nulla facilisi. Quisque faucibus erat id massa porttitor, et placerat ipsum vestibulum. Ut ullamcorper lobortis risus, sit amet venenatis massa porta non. Nulla ultricies eleifend elementum. Nullam in dictum dui. Proin accumsan, diam nec fermentum aliquet, est justo sagittis mi, eget pellentesque dui lectus eu dolor. Mauris efficitur purus massa, id sollicitudin turpis lacinia vel. Nulla in eleifend nisi. Nunc rutrum dapibus molestie.

Nunc id purus sit amet nibh dignissim vulputate. Nullam magna ex, bibendum at leo ut, scelerisque accumsan diam. Proin interdum bibendum vestibulum. In imperdiet a ex non vehicula. Nullam maximus, sem sit amet rhoncus consequat, tortor erat sodales sapien, ac molestie felis leo a est. Quisque sed dui egestas, hendrerit nisl eu, rutrum magna. Morbi tristique porttitor tristique.`;
