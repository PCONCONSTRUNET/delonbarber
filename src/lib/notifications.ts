// Notification sound utility
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

let audioContext: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;

async function initAudio() {
  if (audioContext) return;
  
  try {
    audioContext = new AudioContext();
    const response = await fetch(NOTIFICATION_SOUND_URL);
    const arrayBuffer = await response.arrayBuffer();
    notificationBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('Failed to init audio:', error);
  }
}

export async function playNotificationSound() {
  try {
    // Try Web Audio API first for better control
    if (!audioContext) {
      await initAudio();
    }
    
    if (audioContext && notificationBuffer) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const source = audioContext.createBufferSource();
      source.buffer = notificationBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      return;
    }
    
    // Fallback to simple Audio
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.5;
    await audio.play();
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
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
