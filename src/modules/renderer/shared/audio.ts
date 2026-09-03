export const playBuiltInSound = async (kind: "roll" | "landing", volume = 0.16): Promise<void> => {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "roll" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "roll" ? 180 : 420, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "roll" ? 70 : 120,
      context.currentTime + 0.18,
    );
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.21);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
  } catch {
    // Autoplay policy or unavailable audio must never stop a session.
  }
};
