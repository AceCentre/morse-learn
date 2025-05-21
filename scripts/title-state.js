// Copyright 2018 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const config = require("./config");
import { morseToEnglish } from "./morse-dictionary";
import { timePlaytime, TIMEKEY } from "./time-playtime";

const TRACKING_ALLOWED_KEY = 'isTrackingAllowed';

/**
 * Localstorage stores booleans as strings so we
 * cast them to real bools here
 */
const getBoolFromLocalStore = (key) => {
  const result = localStorage.getItem(key)
  if(result === null) return null
  if(result === 'true') return true
  return false
}

const randomBoolean = () => Math.random() < 0.5;

class TitleState {
  constructor(game, course) {
    this.course = course;
    this.lettersToLearn = course.lettersToLearn;
    this.letterScoreDict = {};
    this.hasStarted = false;
    this.game = game;

    // Only start listening once we have tracking consent
    this.getConsent(() => {
      document.querySelector('.about-button').display = 'block'

      this.setupListeners()
    })
  }

  async getConsent(cb) {
    const trackingConsent = getBoolFromLocalStore(TRACKING_ALLOWED_KEY)

    // If the user has consented either way we can continue
    if(trackingConsent === true || trackingConsent === false) {
      cb()
    } else { // If the user hasn't responded we can wait until they do
      // Show the modal
      const consentModal = document.getElementById('consent-modal');
      const innerModal = document.getElementById('inner-modal')
      consentModal.focus()

      if(this.game.device.iPhone) consentModal.style.alignItems = 'flex-start';
      if(this.game.device.iPhone) innerModal.style.maxHeight = '70vh';

      consentModal.style.display = 'flex';

      const consentYesButton = document.getElementById('consent-yes')
      const consentNoButton = document.getElementById('consent-no')

      consentYesButton.addEventListener('click', () => {
        localStorage.setItem(TRACKING_ALLOWED_KEY, true);

        const randomiseSettings = document.getElementById('randomiseSettings').checked

        if(randomiseSettings) {
          let audio = randomBoolean()
          let speechAssistive = randomBoolean()
          let visualCues = randomBoolean()

          // Not perfectly random but means we don't get invalid settings
          if(audio === false) {
            speechAssistive = false;
          }

          if(audio === false && speechAssistive === false && visualCues === false) {
            audio = true;
          }

          console.log('Going to randomise your settings:', {speechAssistive, audio, visualCues})
          localStorage.setItem('have_speech_assistive', speechAssistive)
          localStorage.setItem('have_audio', audio)
          localStorage.setItem('have_visual_cues', visualCues)
        }

        consentModal.style.display = 'none';
        cb()
      })

      consentNoButton.addEventListener('click', () => {
        localStorage.setItem(TRACKING_ALLOWED_KEY, false);
        consentModal.style.display = 'none';
        cb()
      })
    }

  }

  setupListeners() {
    // This code is pretty flakey, there is probably a cleaner way to do this in phaser
    const canvas = document.querySelector("canvas");

    // If any of the settings are undefined then we default them to true
    if(getBoolFromLocalStore('have_speech_assistive') === null) {
      localStorage.setItem('have_speech_assistive', true)
    }

    if(getBoolFromLocalStore('have_audio') === null) {
      localStorage.setItem('have_audio', true)
    }

    if(getBoolFromLocalStore('have_visual_cues') === null) {
      localStorage.setItem('have_visual_cues', true)
    }

    // Set the initial values to whatever is in local storage
    const initialVisualCues = getBoolFromLocalStore('have_visual_cues')
    const initialAudio = getBoolFromLocalStore('have_audio')
    const initialSpeechAssistive = getBoolFromLocalStore('have_speech_assistive')
    const initialTrackingConsent = getBoolFromLocalStore(TRACKING_ALLOWED_KEY)
    this.game.have_visual_cues = initialVisualCues
    this.game.have_audio = initialAudio
    this.game.have_speech_assistive = initialSpeechAssistive
    this.have_audio = initialAudio;
    this.have_speech_assistive = initialSpeechAssistive;
    this.have_visual_cues = initialVisualCues;

    let audioToggle = document.querySelector(".audio-toggle");
    let speechToggle = document.querySelector(".speech-toggle");
    let visualToggle = document.querySelector(".visual-toggle");
    let trackingToggle = document.querySelector(".consent-toggle");
    let statsButton = document.querySelector(".stats-button");

    // Make the display match the initial state
    audioToggle.classList.add(initialAudio ? 'noop' : 'disabled')
    speechToggle.classList.add(initialSpeechAssistive ? 'noop' : 'disabled')
    visualToggle.classList.add(initialVisualCues ? 'noop' : 'disabled')
    trackingToggle.classList.add(initialTrackingConsent ? 'noop' : 'disabled')

    const startListener = () => doStart();

    function clearEventHandlers() {
      document.removeEventListener("keydown", startListener);
      canvas.removeEventListener("click", startListener);
    }
    let doStart = () => {
      clearEventHandlers();
      document.querySelector(".tl-btn-group").classList.add('gamemode');
      this.game.have_audio = this.have_audio;
      this.game.have_speech_assistive = this.have_speech_assistive;
      this.game.have_visual_cues = this.have_visual_cues;
      console.log('Game starting with settings:', {
        audio: this.game.have_audio,
        speech: this.game.have_speech_assistive,
        visualCues: this.game.have_visual_cues
      });
      this.start();
      this.hasStarted = true;

      timePlaytime()
    };

    document.addEventListener("keydown", startListener);

    canvas.addEventListener("click", startListener);

    document.querySelector(".tl-btn-group").style.display = 'flex';
    let updateAudioToggles = () => {
      audioToggle.classList[this.have_audio ? "remove" : "add"]("disabled");
      speechToggle.classList[
        this.have_audio && this.have_speech_assistive ? "remove" : "add"
      ]("disabled");

      // If we turn sound off we should also turn speech have_speech_assistive off
      if(!this.game.have_audio) {
        this.game.have_speech_assistive = false
        localStorage.setItem('have_speech_assistive', this.have_speech_assistive)
      }
    };
    let onSoundToggle = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.have_audio = !this.have_audio;
      this.game.have_audio = this.have_audio
      localStorage.setItem('have_audio', this.have_audio)
      updateAudioToggles();
    };
    let onSpeechToggle = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      this.have_speech_assistive = !this.have_speech_assistive;
      this.game.have_speech_assistive = this.have_speech_assistive;
      localStorage.setItem('have_speech_assistive', this.have_speech_assistive)

      updateAudioToggles();
    };
    updateAudioToggles();
    audioToggle.addEventListener("click", onSoundToggle, true);
    speechToggle.addEventListener("click", onSpeechToggle, true);

    // This toggle allows the user to enable or disable visual cues.
    const onVisualToggle = (e) => {
      // TODO: If we use a <span> instead of a <a> for the toggle, we don't
      // need to call these two methods.
      e.preventDefault();
      e.stopPropagation();
      this.have_visual_cues = !this.have_visual_cues;
      this.game.have_visual_cues = this.have_visual_cues;
      const action = this.have_visual_cues ? "remove" : "add";
      localStorage.setItem('have_visual_cues', this.have_visual_cues);
      visualToggle.classList[action]("disabled");
      console.log('Visual cues toggled:', this.have_visual_cues);

      // Force update of current game state if game has started
      if (this.hasStarted && this.game.state.current === 'game') {
        // Update the game state to reflect the new setting
        const gameState = this.game.state.states.game;
        if (gameState && gameState.gameSpace) {
          // Force redraw of current word if needed
          const currentWord = gameState.gameSpace.currentWords[gameState.gameSpace.currentWordIndex];
          if (currentWord) {
            const letterIndex = currentWord.currentLetterIndex;
            if (this.have_visual_cues) {
              currentWord.pushUp(letterIndex);
            } else {
              // Reset position if visual cues are disabled
              currentWord.pushDown(letterIndex);
            }
          }
        }
      }
    };
    visualToggle.addEventListener("click", onVisualToggle, true);

    const onTrackingToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const current = getBoolFromLocalStore(TRACKING_ALLOWED_KEY)
      const newValue = !current
      const action = newValue ? "remove" : "add";
      localStorage.setItem(TRACKING_ALLOWED_KEY, newValue)
      trackingToggle.classList[action]("disabled");
    }
    trackingToggle.addEventListener("click", onTrackingToggle, true);

    const resetButton = document.querySelector(".reset-button");
    const onReset = (e) => {
      e.preventDefault();
      e.stopPropagation();

      this.clearProgress();
    }

    resetButton.addEventListener('click', onReset, true)

    // Add statistics button handler
    const onStatsClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      this.showStatistics();
    }

    statsButton.addEventListener('click', onStatsClick, true);

    // Send progress to the server every
    // 60 seconds if consent is turned on
    const SEND_PROGRESS_INTERVAL = 30 * 1000;
    setInterval(() => {
      const consented = getBoolFromLocalStore(TRACKING_ALLOWED_KEY)

      if(consented) this.sendProgress()
    }, SEND_PROGRESS_INTERVAL)
  }

  async sendProgress() {
    console.log("Skipping progress sending")
    // console.log('Sending progress')

    // try {
    //   const visualHints = getBoolFromLocalStore('have_visual_cues')
    //   const sound = getBoolFromLocalStore('have_audio')
    //   const speechHints = getBoolFromLocalStore('have_speech_assistive')
    //   const progress = localStorage.getItem('savedLetters') || JSON.stringify(EMPTY_PROGRESS);
    //   const letterData = localStorage.getItem('analyticsData') || JSON.stringify(EMPTY_ANALYTICS);
    //   const timePlayed = parseInt(localStorage.getItem(TIMEKEY))

    //   const data = {
    //     timePlayed,
    //     visualHints,
    //     sound,
    //     speechHints,
    //     progress: JSON.parse(progress),
    //     letterData: JSON.parse(letterData)
    //   }

    //   await fetch('/.netlify/functions/analytics', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(data),
    //   })

    //   console.log('Progress Sent')
    // } catch (e) {
    //   // We swallow the error and warn because
    //   // collecting analytics shouldn't break the game
    //   console.warn(e)
    // }
  }

  // Clear the current progress
  clearProgress() {
    if (typeof(Storage) !== 'undefined') {
      const confirm = window.confirm('Are you sure you want to clear your progress? This will restart your current game.');
      if (confirm) {
        localStorage.removeItem(this.course.storageKey);
        localStorage.removeItem('intro');
        window.location.reload();
      }
    }
  }

  init(params) {
    // Check if game should restart if resetting progress
    if (params && params.reset) {
      this.hasStarted = false;
      document.getElementById("button").style.display = "block";
      this.game.state.restart();
    }
  }

  create() {
    this.createShapes();
    this.createTitles();

    this.loadLetters().then((loaded) => {
      if (loaded) {
        this.letterScoreDict = loaded;
      } else {
        Object.keys(this.lettersToLearn).forEach((key) => {
          this.letterScoreDict[this.lettersToLearn[key]] = 0;
        });
      }
    });
  }

  // Load letters from localStorage if it exists
  loadLetters() {
    return new Promise((resolve) => {
      if (typeof Storage !== "undefined") {
        if (localStorage[this.course.storageKey]) {
          const saved = JSON.parse(
            localStorage.getItem(this.course.storageKey)
          );
          resolve(saved);
        } else {
          resolve(false);
        }
      }
    });
  }

  // Creates starting fill background
  createShapes() {
    let rect = this.game.add.graphics(0, 0);
    rect.beginFill(0xef4136, 1);
    rect.drawRect(0, 0, this.game.world.width, this.game.world.height, 5000);
    rect.endFill();

    let circle = this.game.add.graphics(0, 0);
    circle.beginFill(0x000000, 1);
    circle.drawCircle(
      0,
      0,
      config.title.mainFontSize * 3
    );
    circle.alpha = 0.4;
    circle.anchor.set(0.5, 0.5);
    circle.position.x = this.game.world.centerX;
    circle.position.y =
      this.game.world.centerY +
      (config.title.titleOffset);
    circle.scale.x = 0;
    circle.scale.y = 0;
    circle.endFill();

    // Intro animation for circle
    this.game.add
      .tween(circle.scale)
      .to({ x: 1, y: 1 }, 1000, Phaser.Easing.Elastic.Out, true, 300);
  }

  // Draws all the titles
  createTitles() {
    const titleText = "Morse\nTyping\nTrainer";
    let title = this.game.add.text(
      this.game.world.centerX,
      this.game.world.centerY +
        (config.title.titleOffset),
      titleText,
      {
        align: "center",
      }
    );
    title.lineSpacing = -10;
    title.fill = "#F1E4D4";
    title.fontSize = config.title.mainFontSize;
    title.anchor.setTo(0.5);
    title.font = config.typography.font;

    const startText = config.GLOBALS.isTouch
      ? "Tap to Start"
      : "Press any button to Start";
    let startButton = this.game.add.text(
      this.game.world.centerX,
      this.game.world.centerY + config.title.startButtonOffset,
      startText,
      {
        align: "center",
      }
    );
    startButton.fontSize = config.title.startButtonSize;
    startButton.fill = "#F1E4D4";
    startButton.anchor.setTo(0.5);
    startButton.font = config.typography.font;
    // Reating animation for start button
    const startButtonTween = this.game.add
      .tween(startButton)
      .to({ alpha: 0.4 }, 600, "Linear", true, 0, -1);
    startButtonTween.yoyo(true, 0);
  }

  // Check if intro has been watched, if so, skip
  checkWatchedIntro() {



    return new Promise((resolve) => {
      if (typeof Storage !== "undefined") {
        resolve(getBoolFromLocalStore('intro'))
      }
    });
  }

  start() {
    // Prevent game from restarting on user input
    if (!this.hasStarted) {
      // Check whether we should play video or not
      this.checkWatchedIntro().then((hasViewedIntro) => {
        document.getElementById("button").style.display = "none";
        this.game.state.start(
          hasViewedIntro ? "game" : "intro",
          true,
          false,
          this.letterScoreDict
        );
      });
    }
  }

  // Show statistics overlay
  showStatistics() {
    // Create a statistics overlay similar to the about overlay
    const existingOverlay = document.getElementById('statistics-overlay');
    if (existingOverlay) {
      document.body.removeChild(existingOverlay);
    }

    const overlay = document.createElement('div');
    overlay.id = 'statistics-overlay';
    overlay.className = 'open';

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Your Learning Statistics';

    const closeButton = document.createElement('button');
    closeButton.innerHTML = `<img src="${window.GameApp.assetPaths.close}">`;
    closeButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: none;
      border: none;
      cursor: pointer;
      z-index: 3;
    `;
    closeButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    // Create statistics content
    const statsContent = this.createStatisticsContent();

    wrapper.appendChild(title);
    wrapper.appendChild(statsContent);
    overlay.appendChild(wrapper);
    overlay.appendChild(closeButton);
    document.body.appendChild(overlay);
  }

  // Create statistics content
  createStatisticsContent() {
    const container = document.createElement('div');

    // Get analytics data from localStorage
    let analyticsData = null;
    const storedData = localStorage.getItem('analyticsData');
    analyticsData = storedData ? JSON.parse(storedData) : null;

    if (!analyticsData) {
      const noData = document.createElement('p');
      noData.textContent = 'No detailed statistics available yet. Start playing to generate statistics.';
      container.appendChild(noData);
      return container;
    }

    // Create a summary paragraph
    const summary = document.createElement('p');
    const totalLetters = this.lettersToLearn.length;
    const learnedLetters = Object.keys(this.letterScoreDict).filter(
      key => this.letterScoreDict[key] >= config.app.LEARNED_THRESHOLD
    ).length;

    summary.textContent = `You've mastered ${learnedLetters} out of ${totalLetters} letters. Here's a breakdown of your progress:`;
    container.appendChild(summary);

    // Create a table for letter statistics
    const table = document.createElement('table');
    table.style.cssText = `
      width: 100%;
      margin-top: 20px;
      border-collapse: collapse;
      color: rgba(0, 0, 0, 0.7);
    `;

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Letter', 'Status', 'Correct', 'Wrong', 'Accuracy'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style.cssText = `
        padding: 10px;
        text-align: left;
        border-bottom: 2px solid rgba(0, 0, 0, 0.2);
      `;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    // Sort letters alphabetically
    const sortedLetters = Object.keys(analyticsData).sort();

    sortedLetters.forEach(letter => {
      const row = document.createElement('tr');

      // Letter cell
      const letterCell = document.createElement('td');
      letterCell.textContent = letter.toUpperCase();
      letterCell.style.cssText = `
        padding: 10px;
        font-weight: bold;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      `;

      // Status cell
      const statusCell = document.createElement('td');
      const isLearned = this.letterScoreDict[letter] >= config.app.LEARNED_THRESHOLD;
      statusCell.textContent = isLearned ? 'Learned' : 'Learning';
      statusCell.style.cssText = `
        padding: 10px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        color: ${isLearned ? '#00a651' : '#ef4136'};
      `;

      // Correct cell
      const correctCell = document.createElement('td');
      correctCell.textContent = analyticsData[letter].correct;
      correctCell.style.cssText = `
        padding: 10px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      `;

      // Wrong cell
      const wrongCell = document.createElement('td');
      wrongCell.textContent = analyticsData[letter].wrong;
      wrongCell.style.cssText = `
        padding: 10px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      `;

      // Accuracy cell
      const accuracyCell = document.createElement('td');
      const total = analyticsData[letter].correct + analyticsData[letter].wrong;
      const accuracy = total > 0 ? Math.round((analyticsData[letter].correct / total) * 100) : 0;
      accuracyCell.textContent = `${accuracy}%`;
      accuracyCell.style.cssText = `
        padding: 10px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      `;

      row.appendChild(letterCell);
      row.appendChild(statusCell);
      row.appendChild(correctCell);
      row.appendChild(wrongCell);
      row.appendChild(accuracyCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  }
}

const EMPTY_PROGRESS = {"e":0,"t":0,"a":0,"i":0,"m":0,"s":0,"o":0,"h":0,"n":0,"c":0,"r":0,"d":0,"u":0,"k":0,"l":0,"f":0,"b":0,"p":0,"g":0,"j":0,"v":0,"q":0,"w":0,"x":0,"y":0,"z":0}
// The default for the analytics
const EMPTY_ANALYTICS = {
  "e": {
      "wrong": 0,
      "correct": 0
  },
  "t": {
      "wrong": 0,
      "correct": 0
  },
  "a": {
      "wrong": 0,
      "correct": 0
  },
  "i": {
      "wrong": 0,
      "correct": 0
  },
  "m": {
      "wrong": 0,
      "correct": 0
  },
  "s": {
      "wrong": 0,
      "correct": 0
  },
  "o": {
      "wrong": 0,
      "correct": 0
  },
  "h": {
      "wrong": 0,
      "correct": 0
  },
  "n": {
      "wrong": 0,
      "correct": 0
  },
  "c": {
      "wrong": 0,
      "correct": 0
  },
  "r": {
      "wrong": 0,
      "correct": 0
  },
  "d": {
      "wrong": 0,
      "correct": 0
  },
  "u": {
      "wrong": 0,
      "correct": 0
  },
  "k": {
      "wrong": 0,
      "correct": 0
  },
  "l": {
      "wrong": 0,
      "correct": 0
  },
  "f": {
      "wrong": 0,
      "correct": 0
  },
  "b": {
      "wrong": 0,
      "correct": 0
  },
  "p": {
      "wrong": 0,
      "correct": 0
  },
  "g": {
      "wrong": 0,
      "correct": 0
  },
  "j": {
      "wrong": 0,
      "correct": 0
  },
  "v": {
      "wrong": 0,
      "correct": 0
  },
  "q": {
      "wrong": 0,
      "correct": 0
  },
  "w": {
      "wrong": 0,
      "correct": 0
  },
  "x": {
      "wrong": 0,
      "correct": 0
  },
  "y": {
      "wrong": 0,
      "correct": 0
  },
  "z": {
      "wrong": 0,
      "correct": 0
  }
}

module.exports.TitleState = TitleState;
