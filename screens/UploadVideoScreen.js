import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import Slider from '@react-native-community/slider';


import MusicPicker from '../components/creator/MusicPicker';
import TextEditor from '../components/creator/TextEditor';

const MIN_CLIP_LENGTH_SECONDS = 1;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

function DraggableTextOverlay({
  overlay,
  onChange,
  onDelete,
  onEdit,
  onDragStart,
  onDragEnd,
}) {
  const position = useRef(
    new Animated.ValueXY({
      x: Number(overlay.x) || 0,
      y: Number(overlay.y) || 0,
    })
  ).current;

  const overlayRef = useRef(overlay);

  const dragStart = useRef({
    x: Number(overlay.x) || 0,
    y: Number(overlay.y) || 0,
  });

  useEffect(() => {
    overlayRef.current = overlay;

    position.setValue({
      x: Number(overlay.x) || 0,
      y: Number(overlay.y) || 0,
    });
  }, [overlay, position]);

  const finishDrag = (gestureState) => {
    const nextX =
      dragStart.current.x + gestureState.dx;

    const nextY =
      dragStart.current.y + gestureState.dy;

    position.setValue({
      x: nextX,
      y: nextY,
    });

    onChange({
      ...overlayRef.current,
      x: nextX,
      y: nextY,
    });

    onDragEnd?.();
  };

  const panResponder = useRef(
    PanResponder.create({
      // Let a normal tap reach the text's edit button.
      onStartShouldSetPanResponder: () => false,

      // Capture only once the finger is actually moving.
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 3 ||
        Math.abs(gestureState.dy) > 3,

      onPanResponderGrant: () => {
        onDragStart?.();

        dragStart.current = {
          x: Number(overlayRef.current.x) || 0,
          y: Number(overlayRef.current.y) || 0,
        };
      },

      onPanResponderMove: (_, gestureState) => {
        position.setValue({
          x: dragStart.current.x + gestureState.dx,
          y: dragStart.current.y + gestureState.dy,
        });
      },

      onPanResponderRelease: (_, gestureState) => {
        finishDrag(gestureState);
      },

      onPanResponderTerminate: (_, gestureState) => {
        finishDrag(gestureState);
      },

      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.textOverlay,
        {
          transform: position.getTranslateTransform(),
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onEdit?.(overlay.id)}
      >
        <Text
          style={{
            color: overlay.color,
            fontSize: overlay.fontSize,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {overlay.text}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.textDeleteButton}
        onPress={() => onDelete(overlay.id)}
        activeOpacity={0.8}
      >
        <Text style={styles.textDeleteText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatTime(totalSeconds = 0) {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number(totalSeconds) || 0)
  );

  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function SelectedVideoPreview({
  videoUri,
  trimStart,
  trimEnd,
  originalAudioVolume,
  onPlayerReady,
  onVideoPlayingChange,
  onTrimLoop,
}) {
  const player = useVideoPlayer(videoUri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.volume = originalAudioVolume;
    videoPlayer.play();
  });

  useEffect(() => {
    player.volume = clamp(
      Number(originalAudioVolume) || 0,
      0,
      1
    );
  }, [player, originalAudioVolume]);

  useEffect(() => {
    onPlayerReady?.(player);
  }, [player, onPlayerReady]);

  useEffect(() => {
    const subscription = player.addListener(
      'playingChange',
      ({ isPlaying }) => {
        onVideoPlayingChange?.(isPlaying);
      }
    );

    return () => {
      subscription?.remove();
    };
  }, [player, onVideoPlayingChange]);

  useEffect(() => {
    player.currentTime = trimStart;
  }, [player, trimStart]);

  useEffect(() => {
    if (trimEnd <= trimStart) {
      return undefined;
    }

    const subscription = player.addListener(
      'timeUpdate',
      ({ currentTime }) => {
        if (currentTime >= trimEnd) {
          player.currentTime = trimStart;
          onTrimLoop?.();
          player.play();
        }
      }
    );

    return () => {
      subscription?.remove();
    };
  }, [player, trimStart, trimEnd, onTrimLoop]);

  return (
    <VideoView
      player={player}
      style={styles.videoPreview}
      contentFit="contain"
      nativeControls
    />
  );
}

function CreatorToolButton({
  icon,
  label,
  active = false,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.creatorToolButton,
        active && styles.creatorToolButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.creatorToolIcon}>{icon}</Text>

      <Text
        style={[
          styles.creatorToolLabel,
          active && styles.creatorToolLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function UploadVideoScreen({ navigation }) {

  const [textOverlays, setTextOverlays] = useState([]);
  const [editingTextId, setEditingTextId] = useState(null);
  const [isDraggingText, setIsDraggingText] = useState(false);
  
  const [caption, setCaption] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectingVideo, setSelectingVideo] = useState(false);

  const [activeTool, setActiveTool] = useState('trim');

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [originalAudioVolume, setOriginalAudioVolume] =
    useState(1);

  const [coverTime, setCoverTime] = useState(0);
  const [coverThumbnail, setCoverThumbnail] = useState(null);
  const [generatingCover, setGeneratingCover] =
    useState(false);
  const [coverConfirmed, setCoverConfirmed] = useState(false);

  const [selectedTrack, setSelectedTrack] = useState(null);
  const [musicVolume, setMusicVolume] = useState(1);
  const [musicStartSeconds, setMusicStartSeconds] =
    useState(0);

  const [videoPlayer, setVideoPlayer] = useState(null);

  const musicPlayer = useAudioPlayer(null, {
    updateInterval: 250,
    downloadFirst: false,
  });

  const loadedMusicUrlRef = useRef(null);
  const isCompositionPreviewRef = useRef(false);
  const syncIntervalRef = useRef(null);
  const isCorrectingMusicRef = useRef(false);

  const videoDurationSeconds =
    selectedVideo?.duration > 0
      ? selectedVideo.duration / 1000
      : 0;

  const selectedClipDuration = Math.max(
    0,
    trimEnd - trimStart
  );

  useEffect(() => {
    try {
      musicPlayer.volume = clamp(
        Number(musicVolume) || 0,
        0,
        1
      );
    } catch (error) {
      console.log('Could not update music volume:', error);
    }
  }, [musicPlayer, musicVolume]);

  useEffect(() => {
    if (!selectedTrack?.audio_url) {
      loadedMusicUrlRef.current = null;

      try {
        musicPlayer.pause();
      } catch (error) {
        console.log('Music player is already stopped:', error);
      }

      return;
    }

    try {
      musicPlayer.pause();
      musicPlayer.replace({
        uri: selectedTrack.audio_url,
      });

      loadedMusicUrlRef.current = selectedTrack.audio_url;

      musicPlayer.volume = clamp(
        Number(musicVolume) || 0,
        0,
        1
      );
    } catch (error) {
      console.error(
        'Could not prepare selected music:',
        error
      );
    }
  }, [selectedTrack, musicPlayer, musicVolume]);

  const stopSyncMonitor = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const pauseMusicSafely = useCallback(() => {
    try {
      musicPlayer.pause();
    } catch (error) {
      console.log('Music player is not available:', error);
    }
  }, [musicPlayer]);

  const prepareMusic = async (
    track = selectedTrack,
    startSeconds = musicStartSeconds,
    volume = musicVolume
  ) => {
    if (!track?.audio_url) {
      return false;
    }

    try {
      if (loadedMusicUrlRef.current !== track.audio_url) {
        musicPlayer.replace({
          uri: track.audio_url,
        });

        loadedMusicUrlRef.current = track.audio_url;

        // Give the native player a brief moment to attach the new source.
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      musicPlayer.volume = clamp(
        Number(volume) || 0,
        0,
        1
      );

      try {
        await musicPlayer.seekTo(
          Math.max(0, Number(startSeconds) || 0)
        );
      } catch (seekError) {
        console.log(
          'Music seek was not ready yet:',
          seekError
        );
      }

      return true;
    } catch (error) {
      console.error('Could not prepare music:', error);
      return false;
    }
  };

  const startSyncMonitor = useCallback(() => {
    stopSyncMonitor();

    if (!videoPlayer || !selectedTrack?.audio_url) {
      return;
    }

    syncIntervalRef.current = setInterval(async () => {
      if (
        !isCompositionPreviewRef.current ||
        isCorrectingMusicRef.current
      ) {
        return;
      }

      try {
        const videoTime =
          Number(videoPlayer.currentTime) || 0;

        const expectedMusicTime =
          Math.max(
            0,
            Number(musicStartSeconds) || 0
          ) +
          Math.max(0, videoTime - trimStart);

        const actualMusicTime =
          Number(musicPlayer.currentTime) || 0;

        const drift = Math.abs(
          actualMusicTime - expectedMusicTime
        );

        if (drift > 0.35) {
          isCorrectingMusicRef.current = true;

          await musicPlayer.seekTo(expectedMusicTime);

          isCorrectingMusicRef.current = false;
        }
      } catch (error) {
        isCorrectingMusicRef.current = false;

        console.log(
          'Could not synchronize music:',
          error
        );
      }
    }, 500);
  }, [
    musicPlayer,
    musicStartSeconds,
    selectedTrack,
    stopSyncMonitor,
    trimStart,
    videoPlayer,
  ]);

  const editingTextOverlay =
    textOverlays.find(
      (overlay) => overlay.id === editingTextId
    ) || null;

  const handleSaveText = (savedOverlay) => {
    setTextOverlays((current) => {
      const alreadyExists = current.some(
        (overlay) => overlay.id === savedOverlay.id
      );

      if (alreadyExists) {
        return current.map((overlay) =>
          overlay.id === savedOverlay.id
            ? savedOverlay
            : overlay
        );
      }

      return [...current, savedOverlay];
    });

    setEditingTextId(savedOverlay.id);
    setActiveTool('text');
  };

  const updateTextOverlay = (updatedOverlay) => {
    setTextOverlays((current) =>
      current.map((overlay) =>
        overlay.id === updatedOverlay.id
          ? updatedOverlay
          : overlay
      )
    );
  };

  const deleteTextOverlay = (id) => {
    setTextOverlays((current) =>
      current.filter((overlay) => overlay.id !== id)
    );

    if (editingTextId === id) {
      setEditingTextId(null);
    }
  };

  const openTextEditor = (id = null) => {
    setEditingTextId(id);
    setActiveTool('text');
  };

  const handleVideoPlayingChange = useCallback(
    async (isPlaying) => {
      if (!isCompositionPreviewRef.current) {
        return;
      }

      if (!isPlaying) {
        pauseMusicSafely();
        stopSyncMonitor();
        return;
      }

      if (!selectedTrack?.audio_url) {
        return;
      }

      try {
        const videoTime =
          Number(videoPlayer?.currentTime) || trimStart;

        const expectedMusicTime =
          Math.max(
            0,
            Number(musicStartSeconds) || 0
          ) +
          Math.max(0, videoTime - trimStart);

        await musicPlayer.seekTo(expectedMusicTime);

        musicPlayer.volume = clamp(
          Number(musicVolume) || 0,
          0,
          1
        );

        musicPlayer.play();
        startSyncMonitor();
      } catch (error) {
        console.log(
          'Could not resume synchronized music:',
          error
        );
      }
    },
    [
      musicPlayer,
      musicStartSeconds,
      musicVolume,
      pauseMusicSafely,
      selectedTrack,
      startSyncMonitor,
      stopSyncMonitor,
      trimStart,
      videoPlayer,
    ]
  );

  const handleTrimLoop = useCallback(async () => {
    if (
      !isCompositionPreviewRef.current ||
      !selectedTrack?.audio_url
    ) {
      return;
    }

    try {
      pauseMusicSafely();

      await musicPlayer.seekTo(
        Math.max(
          0,
          Number(musicStartSeconds) || 0
        )
      );

      musicPlayer.volume = clamp(
        Number(musicVolume) || 0,
        0,
        1
      );

      musicPlayer.play();
    } catch (error) {
      console.log(
        'Could not restart music at loop:',
        error
      );
    }
  }, [
    musicPlayer,
    musicStartSeconds,
    musicVolume,
    pauseMusicSafely,
    selectedTrack,
  ]);

  useEffect(() => {
    return () => {
      isCompositionPreviewRef.current = false;
      stopSyncMonitor();
    };
  }, [stopSyncMonitor]);

  const pickVideo = async () => {
    try {
      setSelectingVideo(true);

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['videos'],
          allowsEditing: false,
          quality: 1,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const video = result.assets[0];
      const fileSize = Number(video.fileSize) || 0;

      if (fileSize > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert(
          'Video is too large',
          'Please choose a video smaller than 50 MB.'
        );
        return;
      }

      const durationMilliseconds = Number(video.duration) || 0;
      const durationSeconds = durationMilliseconds / 1000;

      isCompositionPreviewRef.current = false;
      stopSyncMonitor();
      pauseMusicSafely();
      loadedMusicUrlRef.current = null;

      setSelectedVideo({
        uri: video.uri,
        fileName:
          video.fileName || `ballyplug-${Date.now()}.mp4`,
        mimeType: video.mimeType || 'video/mp4',
        duration: durationMilliseconds,
        fileSize,
        width: Number(video.width) || 0,
        height: Number(video.height) || 0,
      });

      setTrimStart(0);
      setTrimEnd(durationSeconds);

      setOriginalAudioVolume(1);

      setCoverTime(0);
      setCoverThumbnail(null);
      setCoverConfirmed(false);

      setTextOverlays([]);
      setEditingTextId(null);
      setIsDraggingText(false);

      setSelectedTrack(null);
      setMusicVolume(1);
      setMusicStartSeconds(0);

      setVideoPlayer(null);
      setActiveTool('trim');

      console.log('Selected video:', video);
    } catch (error) {
      console.error('Video picker error:', error);

      Alert.alert(
        'Unable to select video',
        'The video could not be selected. Please try again.'
      );
    } finally {
      setSelectingVideo(false);
    }
  };

  const seekVideo = (seconds) => {
    if (!videoPlayer) {
      return;
    }

    videoPlayer.currentTime = clamp(
      Number(seconds) || 0,
      0,
      videoDurationSeconds
    );
  };

  const previewVideoWithMusic = async (
    trackOverride = selectedTrack
  ) => {
    if (!videoPlayer) {
      Alert.alert(
        'Video is preparing',
        'Please wait a moment and try again.'
      );
      return;
    }

    try {
      isCompositionPreviewRef.current = false;
      stopSyncMonitor();

      videoPlayer.pause();
      pauseMusicSafely();

      videoPlayer.currentTime = trimStart;

      if (trackOverride?.audio_url) {
        const ready = await prepareMusic(
          trackOverride,
          musicStartSeconds,
          musicVolume
        );

        if (!ready) {
          throw new Error(
            'The selected music could not be prepared.'
          );
        }

        isCompositionPreviewRef.current = true;

        musicPlayer.play();
        videoPlayer.play();

        startSyncMonitor();
        return;
      }

      videoPlayer.play();
    } catch (error) {
      isCompositionPreviewRef.current = false;
      stopSyncMonitor();
      pauseMusicSafely();

      console.error('Combined preview failed:', error);

      Alert.alert(
        'Preview unavailable',
        'BallyPlug could not start the preview.'
      );
    }
  };

  const handleSelectedTrack = (track) => {
    setSelectedTrack(track);
    setMusicStartSeconds(0);
    setMusicVolume(1);
    setActiveTool('audio');

    setTimeout(() => {
      previewVideoWithMusic(track);
    }, 180);
  };

  const removeSelectedTrack = () => {
    isCompositionPreviewRef.current = false;
    stopSyncMonitor();
    pauseMusicSafely();
    loadedMusicUrlRef.current = null;

    setSelectedTrack(null);
    setMusicStartSeconds(0);
    setMusicVolume(1);
  };

  const handleBack = () => {
    isCompositionPreviewRef.current = false;
    stopSyncMonitor();

    try {
      videoPlayer?.pause();
    } catch (error) {
      console.log('Video player is not available:', error);
    }

    pauseMusicSafely();
    navigation.goBack();
  };

  const handleTrimStartChange = (value) => {
    isCompositionPreviewRef.current = false;
    stopSyncMonitor();
    pauseMusicSafely();

    const maximumAllowedStart = Math.max(
      0,
      trimEnd - MIN_CLIP_LENGTH_SECONDS
    );

    const nextStart = Math.min(value, maximumAllowedStart);

    setTrimStart(nextStart);

    if (!coverConfirmed && coverTime < nextStart) {
      setCoverTime(nextStart);
      setCoverThumbnail(null);
    }
  };

  const handleTrimStartComplete = (value) => {
    const maximumAllowedStart = Math.max(
      0,
      trimEnd - MIN_CLIP_LENGTH_SECONDS
    );

    const nextStart = Math.min(value, maximumAllowedStart);

    setTrimStart(nextStart);

    if (!coverConfirmed && coverTime < nextStart) {
      setCoverTime(nextStart);
      setCoverThumbnail(null);
    }

    seekVideo(nextStart);
  };

  const handleTrimEndChange = (value) => {
    isCompositionPreviewRef.current = false;
    stopSyncMonitor();
    pauseMusicSafely();

    const minimumAllowedEnd = Math.min(
      videoDurationSeconds,
      trimStart + MIN_CLIP_LENGTH_SECONDS
    );

    const nextEnd = Math.max(value, minimumAllowedEnd);

    setTrimEnd(nextEnd);

    if (coverTime > nextEnd) {
      setCoverTime(trimStart);
      setCoverThumbnail(null);
      setCoverConfirmed(false);
    }
  };

  const handleTrimEndComplete = (value) => {
    const minimumAllowedEnd = Math.min(
      videoDurationSeconds,
      trimStart + MIN_CLIP_LENGTH_SECONDS
    );

    const nextEnd = Math.max(value, minimumAllowedEnd);

    setTrimEnd(nextEnd);

    if (coverTime > nextEnd) {
      setCoverTime(trimStart);
      setCoverThumbnail(null);
      setCoverConfirmed(false);
    }

    seekVideo(Math.max(trimStart, nextEnd - 0.25));
  };

  const generateCoverThumbnail = async (
    requestedTime = coverTime
  ) => {
    if (!videoPlayer || !selectedVideo) {
      Alert.alert(
        'Video is still preparing',
        'Please wait a moment and try again.'
      );
      return;
    }

    try {
      setGeneratingCover(true);

      isCompositionPreviewRef.current = false;
      stopSyncMonitor();
      pauseMusicSafely();

      const safeTime = clamp(
        requestedTime,
        trimStart,
        trimEnd
      );

      const thumbnails =
        await videoPlayer.generateThumbnailsAsync(
          [safeTime],
          {
            maxWidth: 720,
            maxHeight: 1280,
          }
        );

      const generatedThumbnail = thumbnails?.[0];

      if (!generatedThumbnail) {
        throw new Error('No thumbnail was generated.');
      }

      setCoverThumbnail(generatedThumbnail);
      setCoverTime(safeTime);
      setCoverConfirmed(false);

      videoPlayer.currentTime = safeTime;
      videoPlayer.pause();
      pauseMusicSafely();
    } catch (error) {
      console.error('Cover generation error:', error);

      Alert.alert(
        'Unable to create cover',
        'BallyPlug could not create a cover from this frame. Please try another position.'
      );
    } finally {
      setGeneratingCover(false);
    }
  };

  const handleToolPress = async (tool) => {
    if (tool === 'text') {
      // If we already have text, reopen the last edited
      // overlay instead of creating a blank editor.
      if (textOverlays.length > 0) {
        const stillExists = textOverlays.some(
          (overlay) => overlay.id === editingTextId
        );

        if (!stillExists) {
          setEditingTextId(
            textOverlays[textOverlays.length - 1].id
          );
        }
      }

      setActiveTool('text');
      return;
    }
    
    setActiveTool(tool);

    if (tool === 'cover') {
      const defaultCoverTime =
        coverTime >= trimStart && coverTime <= trimEnd
          ? coverTime
          : trimStart;

      setCoverTime(defaultCoverTime);

      if (!coverThumbnail) {
        await generateCoverThumbnail(defaultCoverTime);
      }

      return;
    }

    if (['filters', 'effects'].includes(tool)) {
      Alert.alert(
        'Coming next',
        `${tool[0].toUpperCase()}${tool.slice(
          1
        )} will be added in a future Creator Studio step.`
      );
    }
  };

  const handlePost = () => {
    if (!selectedVideo) {
      Alert.alert(
        'Select a video',
        'Please choose a video before continuing.'
      );
      return;
    }

    if (selectedClipDuration < MIN_CLIP_LENGTH_SECONDS) {
      Alert.alert(
        'Clip is too short',
        'Please select at least one second of video.'
      );
      return;
    }

    const finalCoverTime = coverConfirmed
      ? coverTime
      : trimStart;

    const creatorStudioPayload = {
      video: selectedVideo,
      caption: caption.trim(),

      durationSeconds: videoDurationSeconds,
      trimStartSeconds: trimStart,
      trimEndSeconds: trimEnd,
      finalDurationSeconds: selectedClipDuration,

      originalAudioVolume,

      coverTimeSeconds: finalCoverTime,

      selectedSoundId: selectedTrack?.id || null,

      selectedSound: selectedTrack
        ? {
            id: selectedTrack.id,
            title: selectedTrack.title,
            artist: selectedTrack.artist,
            audioUrl: selectedTrack.audio_url,
            licenseCode: selectedTrack.license_code,
          }
        : null,

      soundStartSeconds: musicStartSeconds,
      soundVolume: musicVolume,

      filter: null,
      effects: [],
      textOverlays,
    };

    console.log(
      'Creator Studio payload:',
      creatorStudioPayload
    );

    Alert.alert(
      'Video ready',
      selectedTrack
        ? `${selectedTrack.title} has been attached to your ${formatTime(
            selectedClipDuration
          )} video.`
        : `Your ${formatTime(
            selectedClipDuration
          )} video is ready.`
    );
  };

  const renderActiveTool = () => {
    if (!selectedVideo) {
      return null;
    }

    if (activeTool === 'trim') {
      return (
        <View style={styles.editorPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Trim Video</Text>

            <Text style={styles.clipDuration}>
              Clip: {formatTime(selectedClipDuration)}
            </Text>
          </View>

          <View style={styles.trimTimeRow}>
            <View>
              <Text style={styles.trimTimeLabel}>Start</Text>

              <Text style={styles.trimTimeValue}>
                {formatTime(trimStart)}
              </Text>
            </View>

            <View style={styles.trimArrowContainer}>
              <View style={styles.trimLine} />
              <Text style={styles.trimArrow}>→</Text>
              <View style={styles.trimLine} />
            </View>

            <View style={styles.trimEndText}>
              <Text style={styles.trimTimeLabel}>End</Text>

              <Text style={styles.trimTimeValue}>
                {formatTime(trimEnd)}
              </Text>
            </View>
          </View>

          <Text style={styles.sliderLabel}>
            Start position
          </Text>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(
              0,
              trimEnd - MIN_CLIP_LENGTH_SECONDS
            )}
            value={trimStart}
            minimumTrackTintColor="#0D6EFD"
            maximumTrackTintColor="#3A3A3A"
            thumbTintColor="#FFFFFF"
            onValueChange={handleTrimStartChange}
            onSlidingComplete={handleTrimStartComplete}
          />

          <Text style={styles.sliderLabel}>End position</Text>

          <Slider
            style={styles.slider}
            minimumValue={Math.min(
              videoDurationSeconds,
              trimStart + MIN_CLIP_LENGTH_SECONDS
            )}
            maximumValue={videoDurationSeconds}
            value={trimEnd}
            minimumTrackTintColor="#0D6EFD"
            maximumTrackTintColor="#3A3A3A"
            thumbTintColor="#FFFFFF"
            onValueChange={handleTrimEndChange}
            onSlidingComplete={handleTrimEndComplete}
          />

          <View style={styles.timelineLabels}>
            <Text style={styles.timelineLabelText}>
              0:00
            </Text>

            <Text style={styles.timelineLabelText}>
              {formatTime(videoDurationSeconds)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.previewSelectionButton}
            onPress={() => previewVideoWithMusic()}
            activeOpacity={0.8}
          >
            <Text style={styles.previewSelectionText}>
              {selectedTrack
                ? '▶ Preview video with music'
                : '▶ Preview selected clip'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTool === 'audio') {
      return (
        <View style={styles.editorPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>
              Audio Controls
            </Text>

            <Text style={styles.volumePercentage}>
              {Math.round(originalAudioVolume * 100)}%
            </Text>
          </View>

          <Text style={styles.panelDescription}>
            Balance the original video sound with your
            selected music.
          </Text>

          <Text style={styles.sliderLabel}>
            Original video audio
          </Text>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            value={originalAudioVolume}
            minimumTrackTintColor="#0D6EFD"
            maximumTrackTintColor="#3A3A3A"
            thumbTintColor="#FFFFFF"
            onValueChange={setOriginalAudioVolume}
          />

          <View style={styles.volumeLabels}>
            <Text style={styles.volumeIcon}>🔇</Text>
            <Text style={styles.volumeIcon}>🔊</Text>
          </View>

          {selectedTrack && (
            <>
              <View style={styles.audioDivider} />

              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>
                  Music Volume
                </Text>

                <Text style={styles.volumePercentage}>
                  {Math.round(musicVolume * 100)}%
                </Text>
              </View>

              <Text style={styles.selectedMusicSummary}>
                {selectedTrack.title}
                {selectedTrack.artist
                  ? ` · ${selectedTrack.artist}`
                  : ''}
              </Text>

              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                value={musicVolume}
                minimumTrackTintColor="#0D6EFD"
                maximumTrackTintColor="#3A3A3A"
                thumbTintColor="#FFFFFF"
                onValueChange={setMusicVolume}
              />

              <View style={styles.volumeLabels}>
                <Text style={styles.volumeIcon}>🔇</Text>
                <Text style={styles.volumeIcon}>🎵</Text>
              </View>

              <TouchableOpacity
                style={styles.previewSelectionButton}
                onPress={() => previewVideoWithMusic()}
                activeOpacity={0.8}
              >
                <Text style={styles.previewSelectionText}>
                  ▶ Preview audio mix
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.addMusicButton}
            onPress={() => setActiveTool('music')}
            activeOpacity={0.8}
          >
            <Text style={styles.addMusicIcon}>🎵</Text>

            <View style={styles.addMusicTextContainer}>
              <Text style={styles.addMusicTitle}>
                {selectedTrack
                  ? 'Change music'
                  : 'Add music'}
              </Text>

              <Text style={styles.addMusicSubtitle}>
                {selectedTrack
                  ? selectedTrack.title
                  : 'Browse the BallyPlug music library'}
              </Text>
            </View>

            <Text style={styles.addMusicArrow}>›</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTool === 'music') {
      return (
        <MusicPicker
          selectedTrack={selectedTrack}
          musicVolume={musicVolume}
          onSelectTrack={handleSelectedTrack}
          onRemoveTrack={removeSelectedTrack}
          onClose={() => setActiveTool('trim')}
        />
      );
    }

    if (activeTool === 'text') {
      return (
        <TextEditor
          editingOverlay={editingTextOverlay}
          onSaveText={handleSaveText}
          onDeleteText={deleteTextOverlay}
          onClose={() => {
           
            setActiveTool('trim');
          }}
        />
      );
    }

    if (activeTool === 'cover') {
      return (
        <View style={styles.editorPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Choose Cover</Text>

            {coverConfirmed && (
              <View style={styles.coverSelectedBadge}>
                <Text style={styles.coverSelectedBadgeText}>
                  SELECTED
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.panelDescription}>
            Choose the frame people will see before your
            video begins playing. This step is optional.
          </Text>

          <View style={styles.coverPreviewContainer}>
            {generatingCover ? (
              <View style={styles.coverLoading}>
                <ActivityIndicator
                  size="large"
                  color="#FFFFFF"
                />

                <Text style={styles.coverLoadingText}>
                  Creating cover...
                </Text>
              </View>
            ) : coverThumbnail ? (
              <Image
                source={coverThumbnail}
                style={styles.coverPreview}
                contentFit="contain"
              />
            ) : (
              <View style={styles.coverLoading}>
                <Text style={styles.coverPlaceholderIcon}>
                  🖼️
                </Text>

                <Text style={styles.coverLoadingText}>
                  Move the slider to select a frame
                </Text>
              </View>
            )}

            <View style={styles.coverTimeBadge}>
              <Text style={styles.coverTimeBadgeText}>
                {formatTime(coverTime)}
              </Text>
            </View>
          </View>

          <View style={styles.coverSliderHeader}>
            <Text style={styles.sliderLabel}>
              Video frame
            </Text>

            <Text style={styles.coverSliderTime}>
              {formatTime(coverTime)}
            </Text>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={trimStart}
            maximumValue={Math.max(trimStart, trimEnd)}
            value={coverTime}
            minimumTrackTintColor="#0D6EFD"
            maximumTrackTintColor="#3A3A3A"
            thumbTintColor="#FFFFFF"
            onValueChange={(value) => {
              setCoverTime(value);
              setCoverConfirmed(false);

              if (videoPlayer) {
                videoPlayer.currentTime = value;
                videoPlayer.pause();
                pauseMusicSafely();
              }
            }}
            onSlidingComplete={(value) => {
              generateCoverThumbnail(value);
            }}
          />

          <View style={styles.timelineLabels}>
            <Text style={styles.timelineLabelText}>
              {formatTime(trimStart)}
            </Text>

            <Text style={styles.timelineLabelText}>
              {formatTime(trimEnd)}
            </Text>
          </View>

          <View style={styles.coverActions}>
            <TouchableOpacity
              style={styles.refreshCoverButton}
              onPress={() =>
                generateCoverThumbnail(coverTime)
              }
              disabled={generatingCover}
              activeOpacity={0.8}
            >
              <Text style={styles.refreshCoverText}>
                ↻ Refresh Frame
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectCoverButton,
                coverConfirmed &&
                  styles.selectCoverButtonConfirmed,
              ]}
              onPress={() => {
                if (!coverThumbnail) {
                  Alert.alert(
                    'Choose a frame',
                    'Please generate a cover frame first.'
                  );
                  return;
                }

                setCoverConfirmed(true);

                Alert.alert(
                  'Cover selected',
                  `The frame at ${formatTime(
                    coverTime
                  )} will be used as your video cover.`
                );
              }}
              disabled={
                !coverThumbnail || generatingCover
              }
              activeOpacity={0.8}
            >
              <Text style={styles.selectCoverText}>
                {coverConfirmed
                  ? '✓ Cover Selected'
                  : 'Use This Cover'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.optionalCoverText}>
            Without a custom cover, BallyPlug will use the
            first frame of the selected clip.
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled={!isDraggingText}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonContainer}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Creator Studio
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.videoBox}>
          {selectingVideo ? (
            <View style={styles.videoPlaceholder}>
              <ActivityIndicator
                size="large"
                color="#FFFFFF"
              />

              <Text style={styles.selectingText}>
                Opening your video library...
              </Text>
            </View>
          ) : selectedVideo ? (
            <>
              <SelectedVideoPreview
                videoUri={selectedVideo.uri}
                trimStart={trimStart}
                trimEnd={trimEnd}
                originalAudioVolume={
                  originalAudioVolume
                }
                onPlayerReady={setVideoPlayer}
                onVideoPlayingChange={
                  handleVideoPlayingChange
                }
                onTrimLoop={handleTrimLoop}
              />
              {textOverlays.map((overlay) => (
                <DraggableTextOverlay
                  key={overlay.id}
                  overlay={overlay}
                  onChange={updateTextOverlay}
                  onDelete={deleteTextOverlay}
                  onEdit={(id) => openTextEditor(id)}
                  onDragStart={() => setIsDraggingText(true)}
                  onDragEnd={() => setIsDraggingText(false)}
                />
              ))}

              <TouchableOpacity
                style={styles.changeVideoButton}
                onPress={pickVideo}
                activeOpacity={0.8}
              >
                <Text style={styles.changeVideoText}>
                  Change Video
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.videoPlaceholder}
              onPress={pickVideo}
              activeOpacity={0.85}
            >
              <Text style={styles.cameraIcon}>🎥</Text>

              <Text style={styles.pickVideoTitle}>
                Select a Video
              </Text>

              <Text style={styles.pickVideoText}>
                Tap here to choose a video from your device
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedVideo && (
          <>
            <View style={styles.videoDetails}>
              <View style={styles.videoDetailsTextArea}>
                <Text
                  style={styles.videoFileName}
                  numberOfLines={1}
                >
                  {selectedVideo.fileName}
                </Text>

                <Text style={styles.videoDetailsText}>
                  {formatTime(videoDurationSeconds)}
                  {'  •  '}
                  {selectedVideo.width} ×{' '}
                  {selectedVideo.height}
                </Text>

                {selectedTrack && (
                  <Text
                    style={styles.attachedMusicText}
                    numberOfLines={1}
                  >
                    🎵 {selectedTrack.title}
                    {selectedTrack.artist
                      ? ` · ${selectedTrack.artist}`
                      : ''}
                  </Text>
                )}
              </View>

              <View style={styles.readyBadge}>
                <Text style={styles.readyBadgeText}>
                  READY
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creatorToolbar}
            >
              <CreatorToolButton
                icon="✂️"
                label="Trim"
                active={activeTool === 'trim'}
                onPress={() => handleToolPress('trim')}
              />

              <CreatorToolButton
                icon="🎚️"
                label="Audio"
                active={activeTool === 'audio'}
                onPress={() => handleToolPress('audio')}
              />

              <CreatorToolButton
                icon="🎵"
                label="Music"
                active={activeTool === 'music'}
                onPress={() => handleToolPress('music')}
              />

              <CreatorToolButton
                icon="🖼️"
                label="Cover"
                active={activeTool === 'cover'}
                onPress={() => handleToolPress('cover')}
              />

              <CreatorToolButton
                icon="Aa"
                label="Text"
                active={activeTool === 'text'}
                onPress={() => handleToolPress('text')}
              />

              <CreatorToolButton
                icon="🎨"
                label="Filters"
                active={activeTool === 'filters'}
                onPress={() => handleToolPress('filters')}
              />

              <CreatorToolButton
                icon="✨"
                label="Effects"
                active={activeTool === 'effects'}
                onPress={() => handleToolPress('effects')}
              />
            </ScrollView>

            {renderActiveTool()}
          </>
        )}

        <View style={styles.captionSection}>
          <View style={styles.captionHeader}>
            <Text style={styles.label}>Caption</Text>

            <Text style={styles.characterCount}>
              {caption.length}/500
            </Text>
          </View>

          <TextInput
            style={styles.captionInput}
            placeholder="What's happening?"
            placeholderTextColor="#6B7280"
            multiline
            maxLength={500}
            value={caption}
            onChangeText={setCaption}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.postButton,
            !selectedVideo && styles.disabledButton,
          ]}
          disabled={!selectedVideo || selectingVideo}
          onPress={handlePost}
          activeOpacity={0.8}
        >
          <Text style={styles.postButtonText}>
            CONTINUE TO POST
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  scrollContent: {
    flexGrow: 1,
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  backButtonContainer: {
    width: 70,
    paddingVertical: 6,
  },

  backButton: {
    color: '#0D6EFD',
    fontSize: 16,
    fontWeight: '600',
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 70,
  },

  videoBox: {
    height: 350,
    backgroundColor: '#171717',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
  },

  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  cameraIcon: {
    fontSize: 68,
    marginBottom: 16,
  },

  pickVideoTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },

  pickVideoText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },

  selectingText: {
    color: '#D1D5DB',
    fontSize: 15,
    marginTop: 16,
  },

  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },

  changeVideoButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },

  changeVideoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  videoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
  },

  videoDetailsTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  videoFileName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  videoDetailsText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 4,
  },

  attachedMusicText: {
    color: '#60A5FA',
    fontSize: 13,
    marginTop: 6,
  },

  readyBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  readyBadgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '800',
  },

  creatorToolbar: {
    paddingVertical: 20,
    gap: 10,
  },

  creatorToolButton: {
    width: 76,
    height: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
  },

  creatorToolButtonActive: {
    borderColor: '#0D6EFD',
    backgroundColor: 'rgba(13, 110, 253, 0.16)',
  },

  creatorToolIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 6,
  },

  creatorToolLabel: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
  },

  creatorToolLabelActive: {
    color: '#FFFFFF',
  },

  editorPanel: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 18,
    padding: 17,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  panelTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  panelDescription: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 12,
  },

  clipDuration: {
    color: '#0D6EFD',
    fontSize: 13,
    fontWeight: '700',
  },

  volumePercentage: {
    color: '#0D6EFD',
    fontSize: 14,
    fontWeight: '700',
  },

  trimTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },

  trimTimeLabel: {
    color: '#8E8E93',
    fontSize: 12,
  },

  trimTimeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 3,
  },

  trimEndText: {
    alignItems: 'flex-end',
  },

  trimArrowContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
  },

  trimLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A3A3A',
  },

  trimArrow: {
    color: '#666666',
    marginHorizontal: 5,
  },

  sliderLabel: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
  },

  slider: {
    width: '100%',
    height: 42,
  },

  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  timelineLabelText: {
    color: '#6B7280',
    fontSize: 11,
  },

  previewSelectionButton: {
    alignItems: 'center',
    backgroundColor: '#242424',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 15,
  },

  previewSelectionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  volumeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -5,
  },

  volumeIcon: {
    fontSize: 16,
  },

  audioDivider: {
    height: 1,
    backgroundColor: '#303030',
    marginVertical: 20,
  },

  selectedMusicSummary: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 5,
  },

  addMusicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222222',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 18,
  },

  addMusicIcon: {
    fontSize: 25,
    marginRight: 12,
  },

  addMusicTextContainer: {
    flex: 1,
  },

  addMusicTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  addMusicSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 3,
  },

  addMusicArrow: {
    color: '#8E8E93',
    fontSize: 28,
  },

  coverSelectedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  coverSelectedBadgeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '800',
  },

  coverPreviewContainer: {
    height: 320,
    backgroundColor: '#080808',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    overflow: 'hidden',
    marginTop: 8,
  },

  coverPreview: {
    width: '100%',
    height: '100%',
  },

  coverLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },

  coverLoadingText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },

  coverPlaceholderIcon: {
    fontSize: 46,
  },

  coverTimeBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  coverTimeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  coverSliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 17,
  },

  coverSliderTime: {
    color: '#0D6EFD',
    fontSize: 13,
    fontWeight: '700',
  },

  coverActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  refreshCoverButton: {
    flex: 1,
    backgroundColor: '#292929',
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
  },

  refreshCoverText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  selectCoverButton: {
    flex: 1.3,
    backgroundColor: '#0D6EFD',
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
  },

  selectCoverButtonConfirmed: {
    backgroundColor: '#16A34A',
  },

  selectCoverText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  optionalCoverText: {
    color: '#737373',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 14,
  },

  captionSection: {
    marginTop: 24,
  },

  captionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  characterCount: {
    color: '#6B7280',
    fontSize: 13,
  },

  captionInput: {
    minHeight: 125,
    backgroundColor: '#171717',
    color: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#303030',
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    lineHeight: 22,
  },

  postButton: {
    backgroundColor: '#0D6EFD',
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 28,
  },

  disabledButton: {
    opacity: 0.35,
  },

  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  textOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },

  textDeleteButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textDeleteText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
},
});