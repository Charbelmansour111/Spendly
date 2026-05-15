export const haptics = {
  light:   () => { try { navigator.vibrate?.(8)          } catch {} },
  medium:  () => { try { navigator.vibrate?.(15)         } catch {} },
  success: () => { try { navigator.vibrate?.([10, 50, 10]) } catch {} },
  error:   () => { try { navigator.vibrate?.([30, 20, 30]) } catch {} },
}
