import { useRef, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import useReels from '../hooks/useReels';
import ReelPlayer from '../components/ReelPlayer';
import CommentsBottomSheet from '../components/CommentsBottomSheet';

const { height } = Dimensions.get('window');

export default function GuestReelsScreen() {
  const { reels, loading } = useReels();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  const openComments = (postId) => {
    setSelectedPostId(postId);
    setCommentsVisible(true);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading reels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <FlatList
        data={reels}
        renderItem={({ item, index }) => (
          <ReelPlayer
            reel={item}
            isActive={index === currentIndex}
            onOpenComments={openComments}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
      />

      <CommentsBottomSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        postId={selectedPostId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  center: {
    flex: 1,
    backgroundColor: '#0D0F14',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loading: {
    color: '#fff',
    fontSize: 18,
  },
});