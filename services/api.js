const API_URL = 'https://ballyplug.com/api';

export async function getReels() {
  const response = await fetch(`${API_URL}/reels/`);
  return await response.json();
}