// Notification sound utilities
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const SUCCESS_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3';

let audioContext: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;
let successBuffer: AudioBuffer | null = null;

async function initAudio() {
  if (audioContext && audioContext.state !== 'closed') return;
  
  try {
    audioContext = new AudioContext();
    
    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
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
    // Always try to init/resume audio context
    if (!audioContext || audioContext.state === 'closed') {
      await initAudio();
    }
    
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Try to use pre-loaded buffer
    if (audioContext && buffer) {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      return;
    }
    
    // Fallback to simple Audio element
    const audio = new Audio(fallbackUrl);
    audio.volume = 0.6;
    
    // Add user interaction bypass for mobile
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }
  } catch (error) {
    console.error('Failed to play sound:', error);
    // Last resort: try simple Audio without promise handling
    try {
      const fallbackAudio = new Audio(fallbackUrl);
      fallbackAudio.volume = 0.5;
      fallbackAudio.play();
    } catch (e) {
      console.error('Fallback audio also failed:', e);
    }
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
export async function showBrowserNotification(title: string, body: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  // Try to send via service worker first (works better in background)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        url: '/admin/agenda',
        tag: 'appointment-notification',
      });
      return;
    } catch (e) {
      console.log('Service worker notification failed, falling back to Notification API');
    }
  }
  
  // Fallback to regular Notification API
  const notification = new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
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
