const API_URL = 'https://ballyplug.com/api/v1';

export async function getReels() {
  const response = await fetch(`${API_URL}/reels/?limit=100`);
  return await response.json();
}

export async function countReelView(postId) {
  const formData = new FormData();
  formData.append('post_id', postId);

  const response = await fetch('https://ballyplug.com/api/v1/reels/views.php', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}

export async function connectUser(currentUser, targetUser) {
  const formData = new FormData();
  formData.append('current_user', currentUser);
  formData.append('target_user', targetUser);

  const response = await fetch('https://ballyplug.com/api/v1/users/connect.php', {
    method: 'POST',
    body: formData,
  });

  return await response.json();
}