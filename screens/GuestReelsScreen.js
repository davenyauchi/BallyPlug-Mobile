import { useRef, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions,Modal, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import useReels from '../hooks/useReels';
import ReelPlayer from '../components/ReelPlayer';
import CommentsBottomSheet from '../components/CommentsBottomSheet';
import { useAuth } from '../context/AuthContext';


const { height } = Dimensions.get('window');

export default function GuestReelsScreen({ navigation }) {
  const { reels, loading } = useReels();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const hasShownLoginPrompt = useRef(false);
  const { user } = useAuth();
  console.log('AUTH USER:', user);
  const currentUser = user?.username;

  const openComments = (postId) => {
    setSelectedPostId(postId);
    setCommentsVisible(true);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setCurrentIndex(index);

      if (!user && index >= 4 && !hasShownLoginPrompt.current) {
        hasShownLoginPrompt.current = true;
        setLoginPromptVisible(true);
      }
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
            currentUser={currentUser}
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

      <Modal
        visible={loginPromptVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.loginOverlay}>
          <View style={styles.loginBox}>
            <Text style={styles.loginTitle}>Join BallyPlug</Text>

            <Text style={styles.loginText}>
              Log in to connect, comment, like, and follow creators.
            </Text>

            <Pressable
              style={styles.loginButton}
              onPress={() => {
                setLoginPromptVisible(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.loginButtonText}>Log In</Text>
            </Pressable>

            <Pressable onPress={() => setLoginPromptVisible(false)}>
              <Text style={styles.continueText}>Keep Watching</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  loginOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loginBox: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },

  loginTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  loginText: {
    color: '#D1D5DB',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 22,
  },

  loginButton: {
    backgroundColor: '#0D6EFD',
    width: '100%',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  continueText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
});