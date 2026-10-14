// Original synthesized loop: no recordings, remote audio or autoplay.
export function createMusic(getPosition) {
  let context, master, noise, enabled = false, serverOffset = 0, startedAt = 0, nextStep = -1, scheduled = 0;
  const button = document.querySelector('#music-toggle');
  const feedback = document.querySelector('#music-status');
  function tone(time, frequency, duration, volume, type = 'sine', endFrequency = frequency) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    envelope.gain.setValueAtTime(volume, time); envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(envelope).connect(master); oscillator.start(time); oscillator.stop(time + duration + .01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
  function percussion(time, duration, frequency, volume) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = noise; filter.type = 'highpass'; filter.frequency.value = frequency;
    envelope.gain.setValueAtTime(volume, time); envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter).connect(envelope).connect(master); source.start(time); source.stop(time + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
  }
  function schedule() {
    if (!enabled || !context || context.state !== 'running') return;
    const position = getPosition();
    const distance = Math.hypot(position.x - 7, position.z + 17);
    const volume = document.hidden ? 0 : .16 * Math.max(0, 1 - distance / 35);
    master.gain.setTargetAtTime(volume, context.currentTime, .15);
    const elapsed = (Date.now() + serverOffset - startedAt) / 1000;
    const stepSeconds = .3; // Eighth notes at 100 BPM.
    const currentStep = Math.floor(elapsed / stepSeconds);
    if (nextStep < currentStep || nextStep > currentStep + 2) nextStep = currentStep + 1;
    while (nextStep * stepSeconds < elapsed + .15) {
      const time = context.currentTime + nextStep * stepSeconds - elapsed;
      const step = ((nextStep % 16) + 16) % 16;
      if (step % 4 === 0 || step === 11) tone(time, 130, .17, .7, 'sine', 45);
      if (step === 4 || step === 12) percussion(time, .12, 900, .35);
      percussion(time, .035, 5500, step % 2 ? .10 : .17);
      if ([0, 3, 6, 8, 11, 14].includes(step)) tone(time, step < 8 ? 110 : 146.83, .2, .3, 'triangle');
      if ([2, 5, 9, 13].includes(step)) for (const note of (step < 8 ? [220, 261.63, 329.63] : [293.66, 349.23, 440])) tone(time, note, .15, .06, 'triangle');
      nextStep++; scheduled++;
    }
  }
  button.onclick = async () => {
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error('Áudio indisponível neste navegador.');
        context = new Audio(); master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
        noise = context.createBuffer(1, context.sampleRate * .2, context.sampleRate);
        const samples = noise.getChannelData(0); let seed = 93;
        for (let i = 0; i < samples.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; samples[i] = seed / 4294967296 * 2 - 1; }
      }
      enabled = !enabled;
      if (enabled) { await context.resume(); nextStep = -1; schedule(); }
      else master.gain.setTargetAtTime(0, context.currentTime, .04);
      button.textContent = enabled ? 'Silenciar música' : 'Ligar música'; button.setAttribute('aria-pressed', String(enabled));
      feedback.textContent = enabled ? 'Batida da orla · o som aumenta perto da pista.' : 'Som desligado. Você escolhe quando ouvir.';
    } catch { enabled = false; feedback.textContent = 'Não foi possível ativar o som neste navegador.'; button.setAttribute('aria-pressed', 'false'); }
  };
  const interval = setInterval(schedule, 30);
  window.addEventListener('pagehide', () => { clearInterval(interval); context?.close(); });
  return {
    sync(state) { if (state) { serverOffset = state.serverNow - Date.now(); startedAt = state.party.musicStartedAt; } },
    state: () => ({ enabled, context: context?.state ?? 'off', scheduled }),
  };
}
