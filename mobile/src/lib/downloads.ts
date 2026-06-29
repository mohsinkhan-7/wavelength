import * as FileSystem from 'expo-file-system/legacy';
import type { Track } from '@/types';

// We use the legacy FileSystem API here because it lets us pick an exact
// destination path (named by track id), which keeps offline files predictable.
const DOWNLOAD_DIR = FileSystem.documentDirectory + 'downloads/';

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

// Track ids are prefixed with their source ("jiosaavn:123", "archive:id:file",
// "deezer:456"). The ':' is an illegal filename char on iOS and unreliable on
// Android, so the download would fail — sanitize to a safe base name.
function safeName(trackId: string) {
  return trackId.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Match the saved file's extension to its real container so the player will
// open it. JioSaavn serves .mp4 (AAC); Jamendo/Deezer/Audius serve .mp3. Saving
// AAC bytes under a .mp3 name makes the player refuse the downloaded file.
function extFromUrl(url: string) {
  const path = (url || '').split('?')[0];
  const m = path.match(/\.(mp3|mp4|m4a|aac|ogg|oga|wav|flac|webm)$/i);
  return m ? m[1].toLowerCase() : 'mp3';
}

function fileUriFor(trackId: string, ext: string) {
  return `${DOWNLOAD_DIR}${safeName(trackId)}.${ext}`;
}

// Download a track's audio to local storage. Returns the local file uri.
export async function downloadTrackFile(
  track: Track,
  streamUrl: string,
  onProgress?: (ratio: number) => void
): Promise<string> {
  await ensureDir();
  const dest = fileUriFor(track.id, extFromUrl(streamUrl));

  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) return dest;

  const resumable = FileSystem.createDownloadResumable(
    streamUrl,
    dest,
    {},
    onProgress
      ? (p) => {
          const ratio =
            p.totalBytesExpectedToWrite > 0
              ? p.totalBytesWritten / p.totalBytesExpectedToWrite
              : 0;
          onProgress(ratio);
        }
      : undefined
  );

  const result = await resumable.downloadAsync();
  if (!result?.uri) throw new Error('Download failed');
  return result.uri;
}

// Delete a downloaded file by its stored local uri (the extension varies by
// source, so we delete the exact path saved in the downloads manifest).
export async function deleteDownload(localUri: string): Promise<void> {
  if (!localUri) return;
  await FileSystem.deleteAsync(localUri, { idempotent: true });
}
