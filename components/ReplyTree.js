import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function ReplyTree({ reply, level = 0, onReply }) {
  const indent = Math.min(level, 4) * 14;

  return (
    <View style={[styles.container, { marginLeft: indent }]}>
      <Text style={styles.username}>@{reply.username}</Text>
      <Text style={styles.body}>{reply.reply}</Text>

      <Pressable onPress={() => onReply(reply)}>
        <Text style={styles.reply}>Reply</Text>
      </Pressable>

      {reply.replies?.map((child) => (
        <ReplyTree
          key={child.id}
          reply={child}
          level={level + 1}
          onReply={onReply}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#333',
    paddingLeft: 10,
  },

  username: {
    color: '#6EA8FE',
    fontWeight: 'bold',
  },

  body: {
    color: '#ddd',
    marginTop: 3,
  },

  reply: {
    color: '#888',
    marginTop: 6,
    fontSize: 12,
  },
});