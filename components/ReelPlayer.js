import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable,Share } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

const { height, width } = Dimensions.get('window');

export default function ReelPlayer({ reel, isActive, onOpenComments }) {
  const [paused, setPaused] = useState(false);

  const player = useVideoPlayer(reel.videoUrl, (player) => {
    player.loop = true;
  });

  useEffect(() => {
    if (isActive && !paused) {
      player.play();
    } else {
      player.pause();
    }

    if (!isActive) {
      player.currentTime = 0;
      setPaused(false);
    }
  }, [isActive, paused]);

  const togglePlay = () => {
    setPaused((prev) => !prev);
  };

  const shareReel = async () => {
  try {
    await Share.share({
      title: 'BallyPlug',
      message: `Check out this reel on BallyPlug!\n\n${reel.shareUrl}`,
    });
  } catch (error) {
    console.log(error);
  }
};

  return (
    <View style={styles.container}>
      <Pressable style={styles.videoTapArea} onPress={togglePlay}>
        <VideoView
          style={styles.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      </Pressable>

      <View style={styles.topBrand} pointerEvents="none">
        <Text style={styles.brand}>
          Bally<Text style={styles.blue}>Plug</Text>
        </Text>
      </View>

      {paused && (
        <View style={styles.pauseIcon} pointerEvents="none">
          <Ionicons name="play" size={70} color="white" />
        </View>
      )}

      <View style={styles.bottomFade} pointerEvents="none" />

      <View style={styles.bottomInfo} pointerEvents="none">
        <Text style={styles.username}>@{reel.user.name}</Text>
        <Text style={styles.caption} numberOfLines={2}>
          {reel.title}
        </Text>
        <Text style={styles.audio}>🎵 Original Audio</Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {reel.user.name?.charAt(0)?.toUpperCase() || 'B'}
          </Text>
        </View>

        <Pressable
          style={styles.actionButton}
          onPress={() => onOpenComments(reel.postId)}
        >
          <Ionicons name="chatbubble-outline" size={33} color="white" />
          <Text style={styles.count}>{reel.comments}</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={shareReel}
        >
          <Ionicons name="share-social-outline" size={34} color="white" />
          <Text style={styles.count}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height, width, backgroundColor: '#000' },
  videoTapArea: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  video: { ...StyleSheet.absoluteFillObject },

  topBrand: {
    position: 'absolute',
    top: 55,
    left: 20,
    zIndex: 10,
  },

  brand: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  blue: { color: '#0D6EFD' },

  pauseIcon: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },

  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 135,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 5,
  },

  bottomInfo: {
    position: 'absolute',
    left: 20,
    bottom: 45,
    width: '72%',
    zIndex: 10,
  },

  username: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  caption: { color: '#fff', fontSize: 15, marginBottom: 8 },
  audio: { color: '#fff', fontSize: 13 },

  actions: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
    zIndex: 30,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0D6EFD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 2,
    borderColor: '#fff',
  },

  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  actionButton: { alignItems: 'center', marginBottom: 24, padding: 8 },
  count: { color: '#fff', fontSize: 12, marginTop: 4, fontWeight: '600' },
});