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

export async function getSounds(search = '') {
  const query = search.trim();

  const url = query
    ? `https://ballyplug.com/api/v1/sounds/?search=${encodeURIComponent(
        query
      )}&limit=50`
    : 'https://ballyplug.com/api/v1/sounds/?limit=50';

  const response = await fetch(url);

  const rawResponse = await response.text();

  let data;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    console.error('Invalid sounds response:', rawResponse);

    throw new Error(
      'The music server returned an invalid response.'
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || 'Could not load the music catalog.'
    );
  }

  return data.sounds || [];
}