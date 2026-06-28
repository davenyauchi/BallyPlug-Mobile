const API_URL = 'https://ballyplug.com/api/v1';

export async function getReels() {
  const response = await fetch(`${API_URL}/reels/?limit=100`);
  return await response.json();
}