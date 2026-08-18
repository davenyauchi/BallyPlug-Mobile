import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { connectUser } from '../services/api';

const DEFAULT_COVER =
  'https://ballyplug.com/images/cover_pics/default_cover.jpg';

const DEFAULT_THUMBNAIL =
  'https://ballyplug.com/assets/images/thumbnails/video_placeholder.jpg';

function formatCount(value) {
  const count = Number(value) || 0;

  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }

  return String(count);
}

export default function ProfileScreen({ route, navigation }) {
  const userId = route.params?.userId;
  const { user } = useAuth();

  const currentUser = user?.username || null;

  const [profile, setProfile] = useState(null);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [connectStatus, setConnectStatus] =
    useState('none');

  useEffect(() => {
    if (!userId) {
      setErrorMessage('No user was selected.');
      setLoading(false);
      return;
    }

    loadProfile();
  }, [userId, currentUser]);

  const loadProfile = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const params = new URLSearchParams({
        user_id: String(userId),
      });

      if (currentUser) {
        params.append(
          'current_user',
          currentUser
        );
      }

      const response = await fetch(
        `https://ballyplug.com/api/v1/users/profile.php?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          'Could not load profile.'
        );
      }

      setProfile(data.profile);
      setReels(data.reels || []);

      if (data.profile.isConnected) {
        setConnectStatus('connected');
      } else if (data.profile.requestSent) {
        setConnectStatus('requested');
      } else if (data.profile.requestReceived) {
        setConnectStatus('received');
      } else {
        setConnectStatus('none');
      }
    } catch (error) {
      console.log(
        'Profile load failed:',
        error
      );

      setErrorMessage(
        error.message ||
        'Profile could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!currentUser || !profile) {
      navigation.navigate('Login');
      return;
    }

    if (profile.isOwnProfile) {
      return;
    }

    if (connectStatus !== 'none') {
      return;
    }

    setConnectStatus('requested');

    try {
      const data = await connectUser(
        currentUser,
        profile.username
      );

      if (!data.success) {
        setConnectStatus('none');
        return;
      }

      setConnectStatus(
        data.status || 'requested'
      );
    } catch (error) {
      console.log(
        'Connect failed:',
        error
      );

      setConnectStatus('none');
    }
  };

  const openReel = (item) => {
    /*
     * For now, this returns to the reels screen.
     * We can later make GuestReels open directly at publicId.
     */
    navigation.navigate('GuestReels', {
      publicId: item.publicId,
      postId: item.postId,
    });
  };

  const renderReel = ({ item }) => (
    <Pressable
      style={styles.reelTile}
      onPress={() => openReel(item)}
    >
      <Image
        source={{
          uri:
            item.thumbnailUrl ||
            DEFAULT_THUMBNAIL,
        }}
        style={styles.reelImage}
        resizeMode="cover"
      />

      <View style={styles.reelShade} />

      <View style={styles.reelOverlay}>
        <Ionicons
          name="play"
          size={17}
          color="#fff"
        />

        <Text style={styles.reelViews}>
          {formatCount(item.views)}
        </Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#0D6EFD"
        />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {errorMessage ||
            'Profile could not be loaded.'}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={loadProfile}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={30}
            color="#fff"
          />
        </Pressable>

        <Text
          style={styles.headerUsername}
          numberOfLines={1}
        >
          @{profile.username}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={reels}
        keyExtractor={(item) =>
          item.id.toString()
        }
        numColumns={3}
        renderItem={renderReel}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.cover}>
              <Image
                source={{ uri: DEFAULT_COVER }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            </View>

            <View style={styles.profileHeader}>
              <Image
                source={{
                  uri: profile.profilePic,
                }}
                style={styles.profileImage}
                resizeMode="cover"
              />

              <Text style={styles.username}>
                @{profile.username}
              </Text>

              {!!profile.bio && (
                <Text style={styles.bio}>
                  {profile.bio}
                </Text>
              )}

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {formatCount(profile.posts)}
                  </Text>

                  <Text style={styles.statLabel}>
                    Posts
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {formatCount(
                      profile.connections
                    )}
                  </Text>

                  <Text style={styles.statLabel}>
                    Connections
                  </Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.stat}>
                  <Text style={styles.statNumber}>
                    {formatCount(reels.length)}
                  </Text>

                  <Text style={styles.statLabel}>
                    Reels
                  </Text>
                </View>
              </View>

              {!profile.isOwnProfile && (
                <Pressable
                  style={[
                    styles.connectButton,
                    connectStatus !== 'none' &&
                      styles.connectButtonInactive,
                  ]}
                  onPress={handleConnect}
                  disabled={
                    connectStatus !== 'none'
                  }
                >
                  <Ionicons
                    name={
                      connectStatus === 'connected'
                        ? 'checkmark-circle-outline'
                        : connectStatus === 'requested'
                        ? 'time-outline'
                        : connectStatus === 'received'
                        ? 'person-add-outline'
                        : 'add'
                    }
                    size={20}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.connectButtonText
                    }
                  >
                    {!currentUser
                      ? 'Log in to Connect'
                      : connectStatus ===
                        'connected'
                      ? 'Connected'
                      : connectStatus ===
                        'requested'
                      ? 'Request Sent'
                      : connectStatus ===
                        'received'
                      ? 'Request Received'
                      : 'Connect'}
                  </Text>
                </Pressable>
              )}

              {profile.isOwnProfile && (
                <Pressable
                  style={styles.editButton}
                  onPress={() =>
                    console.log(
                      'Edit profile pressed'
                    )
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    Edit Profile
                  </Text>
                </Pressable>
              )}

              <View style={styles.sectionHeader}>
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color="#fff"
                />

                <Text style={styles.sectionTitle}>
                  Reels
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="videocam-outline"
              size={44}
              color="#6B7280"
            />

            <Text style={styles.emptyTitle}>
              No reels yet
            </Text>

            <Text style={styles.emptyText}>
              Reels posted by this user will
              appear here.
            </Text>
          </View>
        }
        contentContainerStyle={
          styles.listContent
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F14',
  },

  center: {
    flex: 1,
    backgroundColor: '#0D0F14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  loadingText: {
    color: '#CFCFCF',
    marginTop: 12,
  },

  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },

  retryButton: {
    marginTop: 18,
    backgroundColor: '#0D6EFD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  headerBar: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D0F14',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },

  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  headerUsername: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    maxWidth: '70%',
  },

  headerSpacer: {
    width: 40,
  },

  cover: {
    height: 170,
    backgroundColor: '#111827',
  },

  coverImage: {
    width: '100%',
    height: '100%',
  },

  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  profileImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: '#0D0F14',
    marginTop: -58,
    backgroundColor: '#1A1F2B',
  },

  username: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },

  bio: {
    color: '#CFCFCF',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },

  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 18,
  },

  stat: {
    flex: 1,
    alignItems: 'center',
  },

  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: '#26303D',
  },

  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  statLabel: {
    color: '#8A8A8A',
    marginTop: 4,
    fontSize: 13,
  },

  connectButton: {
    width: '100%',
    backgroundColor: '#0D6EFD',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  connectButtonInactive: {
    backgroundColor: '#374151',
  },

  connectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  editButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#3B4252',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#222833',
    marginTop: 22,
    paddingVertical: 14,
  },

  sectionTitle: {
    color: '#fff',
    fontWeight: '700',
  },

  listContent: {
    paddingBottom: 30,
  },

  reelTile: {
    width: '33.333%',
    aspectRatio: 0.75,
    padding: 1,
    backgroundColor: '#111827',
  },

  reelImage: {
    width: '100%',
    height: '100%',
  },

  reelShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  reelOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  reelViews: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 45,
    paddingHorizontal: 25,
  },

  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },

  emptyText: {
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 5,
  },
});