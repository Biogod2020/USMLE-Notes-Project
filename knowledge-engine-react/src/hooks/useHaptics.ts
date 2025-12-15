import { useCallback } from 'react';

// Use standard navigator.vibrate for now.
// In the future, this can be upgraded to key into Tauri's haptics plugin if present.
export function useHaptics() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      // Wrap in try-catch as some browsers throw if user hasn't interacted
      try {
          navigator.vibrate(pattern);
      } catch (e) {
          // Ignore
      }
    }
  }, []);

  const selection = useCallback(() => {
    vibrate(10); // Very light tap
  }, [vibrate]);

  const success = useCallback(() => {
    vibrate([10, 30, 10]); // Short double tap
  }, [vibrate]);

  const impactLight = useCallback(() => {
    vibrate(15); 
  }, [vibrate]);
  
  const impactMedium = useCallback(() => {
    vibrate(25); 
  }, [vibrate]);
  
  const impactHeavy = useCallback(() => {
    vibrate(40); 
  }, [vibrate]);

  return { selection, success, impactLight, impactMedium, impactHeavy };
}
