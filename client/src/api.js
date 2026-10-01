export const getToken = () => localStorage.getItem('crm_token');
export const setToken = (t) => (t ? localStorage.setItem('crm_token', t) : localStorage.removeItem('crm_token'));

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() && { Authorization: `Bearer ${getToken()}` }) },
      body: body && JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Make sure the server window is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && getToken()) { setToken(null); location.reload(); }
  if (!res.ok) {
    throw new Error(data.error || (res.status >= 500
      ? 'The server is not responding. Start it (npm run dev in the server folder) and read its window for errors.'
      : 'Something went wrong'));
  }
  return data;
}
