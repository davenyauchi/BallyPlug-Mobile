import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import ReplyTree from './ReplyTree';

export default function CommentsBottomSheet({
  visible,
  onClose,
  postId,
  username = 'Frankenstein',
}) {
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['45%', '75%', '95%'], []);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    const response = await fetch(
      `https://ballyplug.com/api/comments/?post_id=${postId}`
    );

    const data = await response.json();

    if (data.success) {
      setComments(data.comments);
    }
  };

  const sendComment = async () => {
    if (!commentText.trim()) return;

    if (replyingTo) {
      const formData = new FormData();

      formData.append('comment_id', replyingTo.commentId);
      formData.append(
        'parent_reply_id',
        replyingTo.isReply ? replyingTo.id : ''
      );
      formData.append('post_id', postId);
      formData.append('username', username);
      formData.append('reply', commentText);

      const response = await fetch(
        'https://ballyplug.com/api/comments/reply.php',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        setCommentText('');
        setReplyingTo(null);
        loadComments();
      }

      return;
    }

    const formData = new FormData();
    formData.append('post_id', postId);
    formData.append('username', username);
    formData.append('comment', commentText);

    const response = await fetch('https://ballyplug.com/api/comments/add.php', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      setCommentText('');
      loadComments();
    }
  };

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{comments.length} Comments</Text>

        <BottomSheetFlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.commentsList}
          renderItem={({ item }) => (
            <View style={styles.commentBlock}>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={styles.comment}>{item.comment}</Text>

              <Pressable
                onPress={() =>
                  setReplyingTo({
                    id: item.id,
                    username: item.username,
                    isReply: false,
                    commentId: item.id,
                  })
                }
              >
                <Text style={styles.replyButton}>Reply</Text>
              </Pressable>

              {item.replies?.map((reply) => (
                <ReplyTree
                  key={reply.id}
                  reply={reply}
                  onReply={(selectedReply) => {
                    setReplyingTo({
                      id: selectedReply.id,
                      username: selectedReply.username,
                      isReply: true,
                      commentId: item.id,
                    });
                  }}
                />
              ))}
            </View>
          )}
        />

        {replyingTo && (
          <View style={styles.replyingBox}>
            <Text style={styles.replyingText}>
              Replying to @{replyingTo.username}
            </Text>

            <Pressable onPress={() => setReplyingTo(null)}>
              <Text style={styles.cancelReply}>Cancel</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.inputRow}>
          <BottomSheetTextInput
            style={styles.input}
            placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
            placeholderTextColor="#999"
            value={commentText}
            onChangeText={setCommentText}
          />

          <Pressable style={styles.sendButton} onPress={sendComment}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#0D0F14',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },

  handle: {
    backgroundColor: '#666',
  },

  container: {
    flex: 1,
    paddingHorizontal: 18,
  },

  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },

  commentsList: {
    paddingBottom: 20,
  },

  commentBlock: {
    marginBottom: 18,
  },

  username: {
    color: '#0D6EFD',
    fontWeight: 'bold',
    marginBottom: 4,
  },

  comment: {
    color: '#fff',
    fontSize: 15,
  },

  replyButton: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 6,
  },

  replyingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  replyingText: {
    color: '#aaa',
  },

  cancelReply: {
    color: '#0D6EFD',
    fontWeight: 'bold',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 12,
    paddingBottom: 12,
  },

  input: {
    flex: 1,
    backgroundColor: '#1A1F2B',
    color: '#fff',
    padding: 12,
    borderRadius: 20,
    marginRight: 10,
  },

  sendButton: {
    backgroundColor: '#0D6EFD',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  sendText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});