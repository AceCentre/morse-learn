const { Howl } = require('howler');

class SoundManager {
  constructor() {
    this.sounds = {};
  }

  createSound(name, path) {
    const newSound = new Howl({
      src: [`${path}.mp3`]
      // src: [ `${path}.m4a`,`${path}.mp3` ]
    });

    this.sounds[name] = newSound;
  }

  playSound(name) {
    try {
      // Stop the sound first to prevent AbortError
      this.stopSound(name);
      // Then play it
      this.sounds[name].play();
    } catch (error) {
      console.warn(`Error playing sound ${name}:`, error);
    }
  }

  soundDuration(name) {
    const duration = this.sounds[name].duration();
    return duration;
  }

  stopSound(name) {
    try {
      if (this.sounds[name]) {
        this.sounds[name].stop();
      }
    } catch (error) {
      console.warn(`Error stopping sound ${name}:`, error);
    }
  }
}

module.exports.SoundManager = SoundManager;
