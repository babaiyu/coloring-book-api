// Checking expired token
function isTokenExpired(expTimestamp: number) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return currentTimestamp > expTimestamp;
}

// Checking expired token from URL
export function checkIsTokenExpired(url: string) {
  const expMatch = url.match(/exp=(\d+)/);

  if (expMatch) {
    const expTimestamp = parseInt(expMatch[1], 10);

    // Checking expiration of token
    const expired = isTokenExpired(expTimestamp);

    if (expired) {
      return true; // Token is expired
    } else {
      return false; // Token still valid!
    }
  }

  return true;
}
