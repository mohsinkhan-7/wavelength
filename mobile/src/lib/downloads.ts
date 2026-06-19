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

function fileUriFor(trackId: string) {
  return `${DOWNLOAD_DIR}${trackId}.mp3`;
}

// Download a track's audio to local storage. Returns the local file uri.
export async function downloadTrackFile(
  track: Track,
  streamUrl: string,
  onProgress?: (ratio: number) => void
): Promise<string> {
  await ensureDir();
  const dest = fileUriFor(track.id);

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

export async function isDownloaded(trackId: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(fileUriFor(trackId));
  return info.exists;
}

export async function deleteDownload(trackId: string): Promise<void> {
  await FileSystem.deleteAsync(fileUriFor(trackId), { idempotent: true });
}

export function localUriFor(trackId: string): string {
  return fileUriFor(trackId);
}
