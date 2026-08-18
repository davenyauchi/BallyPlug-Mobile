import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

import { getSounds } from '../../services/api';

function formatDuration(totalSeconds = 0) {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number(totalSeconds) || 0)
  );

  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function TrackArtwork({ track }) {
  if (track.artwork_url) {
    return (
      <Image
        source={{ uri: track.artwork_url }}
        style={styles.artwork}
      />
    );
  }

  return (
    <View style={styles.artworkPlaceholder}>
      <Text style={styles.artworkIcon}>♪</Text>
    </View>
  );
}

export default function MusicPicker({
  selectedTrack,
  musicVolume = 1,
  onSelectTrack,
  onRemoveTrack,
  onClose,
}) {
  const [tracks, setTracks] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [previewTrackId, setPreviewTrackId] =
    useState(null);

  const player = useAudioPlayer(null, {
    updateInterval: 250,
    downloadFirst: false,
  });

  const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => {
    try {
        player.volume = Math.max(
        0,
        Math.min(1, Number(musicVolume) || 0)
        );
    } catch (error) {
        console.log(
        'Could not update music volume:',
        error
        );
    }
    }, [player, musicVolume]);

  const loadTracks = async (
    search = '',
    isSearch = false
  ) => {
    try {
      if (isSearch) {
        setSearching(true);
      } else {
        setLoading(true);
      }

      setError('');

      const result = await getSounds(search);
      setTracks(result);
    } catch (requestError) {
      console.error(
        'Music catalog error:',
        requestError
      );

      setError(
        requestError.message ||
          'Could not load the music catalog.'
      );
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
        loadTracks(searchText, searchText.trim() !== '');
    }, searchText.trim() === '' ? 0 : 450);

    return () => clearTimeout(timeout);
    }, [searchText]);

  useEffect(() => {
    if (
      previewTrackId &&
      playerStatus.didJustFinish
    ) {
      setPreviewTrackId(null);
    }
  }, [
    previewTrackId,
    playerStatus.didJustFinish,
  ]);

  const selectedTrackId = useMemo(
    () =>
      selectedTrack?.id !== undefined &&
      selectedTrack?.id !== null
        ? Number(selectedTrack.id)
        : null,
    [selectedTrack]
  );

  const stopPreview = async () => {
    try {
        player.pause();
        await player.seekTo(0);
    } catch (error) {
        console.log(
        'Music player was already released:',
        error
        );
    } finally {
        setPreviewTrackId(null);
    }
    };

    const togglePreview = async (track) => {
        const trackId = Number(track.id);

        try {
            if (
            previewTrackId === trackId &&
            playerStatus.playing
            ) {
            player.pause();
            return;
            }

            if (
            previewTrackId === trackId &&
            !playerStatus.playing
            ) {
            player.play();
            return;
            }

            player.pause();

            player.replace({
            uri: track.audio_url,
            });

            player.volume = Math.max(
            0,
            Math.min(1, Number(musicVolume) || 0)
            );

            setPreviewTrackId(trackId);

            await player.seekTo(0);
            player.play();
        } catch (previewError) {
            console.error(
            'Music preview failed:',
            previewError
            );

            setError(
            'This track could not be previewed.'
            );

            setPreviewTrackId(null);
        }
        };

  const selectTrack = async (track) => {
    await stopPreview();
    onSelectTrack?.(track);
  };

  const removeTrack = async () => {
    await stopPreview();
    onRemoveTrack?.();
  };

  const renderTrack = ({ item }) => {
    const trackId = Number(item.id);
    const isSelected =
      selectedTrackId === trackId;

    const isPreviewing =
      previewTrackId === trackId &&
      playerStatus.playing;

    return (
      <View
        style={[
          styles.trackRow,
          isSelected && styles.selectedTrackRow,
        ]}
      >
        <TrackArtwork track={item} />

        <View style={styles.trackDetails}>
          <Text
            style={styles.trackTitle}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <Text
            style={styles.trackArtist}
            numberOfLines={1}
          >
            {item.artist || 'Unknown artist'}
          </Text>

          <Text
            style={styles.trackMeta}
            numberOfLines={1}
          >
            {[
              item.genre,
              item.mood,
              formatDuration(
                item.duration_seconds
              ),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => togglePreview(item)}
          activeOpacity={0.75}
        >
          <Text style={styles.previewButtonText}>
            {isPreviewing ? 'Ⅱ' : '▶'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.useButton,
            isSelected && styles.useButtonSelected,
          ]}
          onPress={() => selectTrack(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.useButtonText}>
            {isSelected ? '✓' : 'Use'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Add Music
          </Text>

          <Text style={styles.subtitle}>
            Preview and select a track
          </Text>
        </View>

        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.75}
          >
            <Text style={styles.closeButtonText}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedTrack && (
        <View style={styles.selectedCard}>
          <View style={styles.selectedTextArea}>
            <Text style={styles.selectedLabel}>
              SELECTED MUSIC
            </Text>

            <Text
              style={styles.selectedTitle}
              numberOfLines={1}
            >
              {selectedTrack.title}
            </Text>

            <Text
              style={styles.selectedArtist}
              numberOfLines={1}
            >
              {selectedTrack.artist ||
                'Unknown artist'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={removeTrack}
            activeOpacity={0.75}
          >
            <Text style={styles.removeButtonText}>
              Remove
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>
          ⌕
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search music"
          placeholderTextColor="#737373"
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {searching && (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        )}

        {!!searchText && !searching && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
          >
            <Text style={styles.clearSearch}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            onPress={() =>
              loadTracks(searchText)
            }
          >
            <Text style={styles.retryText}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#0D6EFD"
          />

          <Text style={styles.loadingText}>
            Loading music...
          </Text>
        </View>
      ) : (
        <View style={styles.listContent}>
            {tracks.length === 0 ? (
                <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>♪</Text>

                <Text style={styles.emptyTitle}>
                    No music found
                </Text>

                <Text style={styles.emptyText}>
                    Try another title, artist, genre, or mood.
                </Text>
                </View>
            ) : (
                tracks.map((track) => (
                <View key={String(track.id)}>
                    {renderTrack({ item: track })}
                </View>
                ))
            )}
            </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 560,
    backgroundColor: '#111111',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  subtitle: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 3,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 13,
    borderRadius: 14,
    backgroundColor:
      'rgba(13, 110, 253, 0.14)',
    borderWidth: 1,
    borderColor: '#0D6EFD',
  },

  selectedTextArea: {
    flex: 1,
    paddingRight: 10,
  },

  selectedLabel: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  selectedTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },

  selectedArtist: {
    color: '#A3A3A3',
    fontSize: 12,
    marginTop: 2,
  },

  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#292929',
  },

  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 13,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#202020',
    borderWidth: 1,
    borderColor: '#303030',
  },

  searchIcon: {
    color: '#8E8E93',
    fontSize: 21,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 0,
  },

  clearSearch: {
    color: '#A3A3A3',
    fontSize: 15,
    paddingLeft: 10,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },

  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },

  selectedTrackRow: {
    backgroundColor:
      'rgba(13, 110, 253, 0.08)',
  },

  artwork: {
    width: 52,
    height: 52,
    borderRadius: 11,
    backgroundColor: '#252525',
  },

  artworkPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 11,
    backgroundColor: '#292929',
    alignItems: 'center',
    justifyContent: 'center',
  },

  artworkIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },

  trackDetails: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  trackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  trackArtist: {
    color: '#A3A3A3',
    fontSize: 12,
    marginTop: 3,
  },

  trackMeta: {
    color: '#666666',
    fontSize: 11,
    marginTop: 4,
  },

  previewButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#292929',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  useButton: {
    minWidth: 50,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    backgroundColor: '#0D6EFD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  useButtonSelected: {
    backgroundColor: '#16A34A',
  },

  useButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 12,
  },

  emptyList: {
    flexGrow: 1,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyIcon: {
    color: '#737373',
    fontSize: 50,
    marginBottom: 12,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  emptyText: {
    color: '#737373',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 19,
  },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor:
      'rgba(239, 68, 68, 0.12)',
  },

  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
  },

  retryText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },
});