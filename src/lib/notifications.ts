// Notification sound utilities
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const SUCCESS_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3';

let audioContext: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;
let successBuffer: AudioBuffer | null = null;

async function initAudio() {
  if (audioContext) return;
  
  try {
    audioContext = new AudioContext();
    const [notifResponse, successResponse] = await Promise.all([
      fetch(NOTIFICATION_SOUND_URL),
      fetch(SUCCESS_SOUND_URL)
    ]);
    const [notifArrayBuffer, successArrayBuffer] = await Promise.all([
      notifResponse.arrayBuffer(),
      successResponse.arrayBuffer()
    ]);
    notificationBuffer = await audioContext.decodeAudioData(notifArrayBuffer);
    successBuffer = await audioContext.decodeAudioData(successArrayBuffer);
  } catch (error) {
    console.error('Failed to init audio:', error);
  }
}

async function playSound(buffer: AudioBuffer | null, fallbackUrl: string) {
  try {
    if (!audioContext) {
      await initAudio();
    }
    
    if (audioContext && buffer) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      return;
    }
    
    // Fallback to simple Audio
    const audio = new Audio(fallbackUrl);
    audio.volume = 0.5;
    await audio.play();
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
}

export async function playNotificationSound() {
  await playSound(notificationBuffer, NOTIFICATION_SOUND_URL);
}

export async function playSuccessSound() {
  await playSound(successBuffer, SUCCESS_SOUND_URL);
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

// Show browser notification
export function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: 'appointment-notification',
  });
  
  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }
  
  // Auto close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}
