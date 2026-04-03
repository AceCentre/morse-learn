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

import { Word } from "./word";
import { MorseBoard } from './morse-board'
let _ = require("lodash");
const config = require("./config");
// Create our own delay function using setTimeout
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class GameSpace {
  constructor(game) {
    console.log('Game space constructor called');

    this.parent = null;
    this.currentLettersInPlay = [];
    /** @type {Array<Word>} */
    this.currentWords = [];
    this.currentWordIndex = 0;
    this.mistakeCount = 0;
    this.consecutiveCorrect = 0;
    this.inputReady = true;
    this.game = game;
    this.gameSpaceGroup = this.game.add.group();

    // Set up background colors for word blocks with brighter, more visible colors
    this.allBgColors = [
      0xF05A5A, // Red
      0x5A9BF0, // Blue
      0x5AF0B2, // Green
      0xF0D15A, // Yellow
      0xC55AF0  // Purple
    ];

    this.allBgColorsString = [
      '#F05A5A', // Red
      '#5A9BF0', // Blue
      '#5AF0B2', // Green
      '#F0D15A', // Yellow
      '#C55AF0'  // Purple
    ];
  }

  // Update the word backgrounds to mute non-current words
  updateWordBackgrounds() {
    for (let i = 0; i < this.currentWords.length; i++) {
      const word = this.currentWords[i];
      const isCurrentWord = i === this.currentWordIndex;

      // Apply a tint to mute the colors of non-current words
      if (word.background) {
        if (isCurrentWord) {
          // Current word - full brightness
          word.background.tint = 0xFFFFFF; // No tint (full color)
        } else {
          // Non-current word - muted colors
          word.background.tint = 0xAAAAAA; // Slight gray tint to mute the color
        }
      }
    }
  }

  findAWord() {
    console.log('Finding a word');

    try {
      // Default words to use if course words aren't available
      const defaultWords = [
        'cat', 'dog', 'hat', 'bat', 'rat', 'sat', 'mat', 'fat',
        'run', 'sun', 'fun', 'bun', 'gun', 'pun',
        'red', 'bed', 'fed', 'led', 'wed', 'ted',
        'big', 'dig', 'fig', 'pig', 'wig', 'zig',
        'box', 'fox', 'lox', 'sox', 'tox', 'vox'
      ];

      // Use course words if available, otherwise use default words
      const words = (this.parent && this.parent.course && this.parent.course.words)
        ? this.parent.course.words
        : defaultWords;

      const shuffled = _.shuffle(words);

      // Get the newest letter in play
      const newestLetter = this.currentLettersInPlay.length > 0
        ? this.currentLettersInPlay[this.currentLettersInPlay.length - 1]
        : 'a';

      let myWord;

      // Check if letters in play has some added already
      if (this.currentLettersInPlay.length < 3) {
        // Use course letters if available, otherwise use default letters
        if (this.parent && this.parent.course && this.parent.course.lettersToLearn) {
          this.currentLettersInPlay = this.parent.course.lettersToLearn.slice(0, 3);
        } else {
          this.currentLettersInPlay = ['a', 'b', 'c'];
        }
      }

      for (let s = 0; s < shuffled.length; s++) {
        let onlyTheseLetters = true;

        // Exclude all letters that aren't in the current pool
        for (let l = 0; l < shuffled[s].length; l++) {
          if (_.indexOf(this.currentLettersInPlay, shuffled[s][l]) === -1) {
            onlyTheseLetters = false;
          }
        }

        if (onlyTheseLetters) {
          // Check to see if newest letter hasn't been learned, then only use
          const newestLetterScore = this.letterScoreDict
            ? this.letterScoreDict[newestLetter]
            : undefined;
          if (Number.isFinite(newestLetterScore) &&
              newestLetterScore < config.app.LEARNED_THRESHOLD) {
            if (_.indexOf(shuffled[s], newestLetter) > -1) {
              myWord = shuffled[s];
              break;
            }
          } else {
            myWord = shuffled[s];
            break;
          }
        }
      }

      // If no word was found, use a default word
      if (!myWord) {
        console.warn('No suitable word found, using default word');
        myWord = 'cat';
      }

      console.log('Found word:', myWord);
      return myWord;
    } catch (error) {
      console.error('Error finding a word:', error);
      return 'cat'; // Default fallback word
    }
  }

  create() {
    console.log('Game space create method called');

    try {
      // Initialize default values
      this.gameSpaceGroup = this.game.add.group();
      this.currentWords = [];
      this.currentLettersInPlay = [];

      // Set up background colors for word blocks
      this.allBgColors = [
        0xF05A5A, // Red
        0x5A9BF0, // Blue
        0x5AF0B2, // Green
        0xF0D15A, // Yellow
        0xC55AF0  // Purple
      ];

      this.allBgColorsString = [
        '#F05A5A', // Red
        '#5A9BF0', // Blue
        '#5AF0B2', // Green
        '#F0D15A', // Yellow
        '#C55AF0'  // Purple
      ];

      if (!this.parent) {
        console.error('Game space parent is undefined');
        return;
      }

      if (!this.parent.letterScoreDict) {
        console.error('Letter score dictionary is undefined');
        this.letterScoreDict = {};
      } else {
        this.letterScoreDict = this.parent.letterScoreDict;
      }

      if (!this.parent.course || !this.parent.course.lettersToLearn) {
        console.error('Course or letters to learn is undefined');
        this.newLetterArray = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']; // Default fallback
      } else {
        this.newLetterArray = this.parent.course.lettersToLearn.slice(0);
      }

      this.newLetterArray.sort();
      console.log('Letters to learn:', this.newLetterArray);

      this.loadLetters();
      console.log('Letters loaded');

      // Check for saved one-switch mode preference
      const oneSwitchMode = typeof Storage !== "undefined" ?
        localStorage.getItem("one_switch_mode") === "true" : false;
      console.log('One-switch mode:', oneSwitchMode);

      // Check if window.GameApp and assetPaths exist
      if (!window.GameApp || !window.GameApp.assetPaths) {
        console.error('GameApp or assetPaths is undefined');
      }

      const dashSoundPath = window.GameApp && window.GameApp.assetPaths ?
        window.GameApp.assetPaths.dashSound : '../assets/sounds/dash.mp3';
      const dotSoundPath = window.GameApp && window.GameApp.assetPaths ?
        window.GameApp.assetPaths.dotSound : '../assets/sounds/dot.mp3';

      this.morseBoard = new MorseBoard({
        debounce: 2e3,
        dashSoundPath: dashSoundPath,
        dotSoundPath: dotSoundPath,
        notificationStyle: "output",
        game: this.game,
        onCommit: (e) =>  {
          this.checkMatch(e.letter ? e.letter : "");
        },
        // Initialize one-switch mode from saved preference
        oneSwitchMode: oneSwitchMode,
        oneSwitchKeyMap: [88], // X key
        oneSwitchTimeout: 500, // ms
      });
      console.log('Morse board created');
    } catch (error) {
      console.error('Error in game space create method:', error);
    }

    // Create word objects with a slight delay to ensure everything is initialized
    setTimeout(() => {
      try {
        console.log('Creating initial word objects');

        // Get the number of words to start with from config or use default
        const howManyWordsToStart = config.app.howManyWordsToStart || 3;
        console.log('Creating', howManyWordsToStart, 'initial words');

        // Create the initial words
        for (let i = 0; i < howManyWordsToStart; i++) {
          this.makeWordObject();
        }

        console.log('Initial words created:', this.currentWords.length);

        // Position the words
        for (let i = 0; i < this.currentWords.length; i++) {
          if (i > 0) {
            // Position subsequent words based on the previous word
            const prevWord = this.currentWords[i - 1];
            if (prevWord && prevWord.letterObjects && prevWord.letterObjects.length > 0) {
              const myStartX =
                prevWord.myStartX +
                prevWord.letterObjects.length * config.app.wordBrickSize +
                (config.app.spaceBetweenWords || 20);
              this.currentWords[i].setPosition(myStartX);
            } else {
              // Fallback if previous word is not properly initialized
              const startX = this.game.world.centerX + (i * 100);
              this.currentWords[i].setPosition(startX);
            }
          } else {
            // Create the first word (centered)
            this.createFirstWord();
          }
        }

        console.log('Words positioned successfully');
      } catch (error) {
        console.error('Error creating word objects:', error);
      }
    }, 500); // Increased delay to ensure everything is ready
  }

  async createFirstWord() {
    console.log('Creating first word');

    try {
      // Make sure we have at least one word
      if (this.currentWords.length === 0) {
        console.warn('No words available, creating a new word');
        this.makeWordObject();
      }

      let word = this.currentWords[0];
      if (!word) {
        console.error('Failed to create first word');
        return;
      }

      let letter = word.myLetters[word.currentLetterIndex];
      console.log('First word:', word.myLetters.join(''), 'First letter:', letter);

      // Position the first word in the center of the screen
      const centerX = this.game.world.centerX;
      word.setPosition(centerX);
      console.log('Word positioned at center:', centerX);

      // Update word backgrounds to highlight the current word
      this.updateWordBackgrounds();

      // Animate stuff immediately when first starting
      try {
        this.game.add
          .tween(word.pills[0].scale)
          .to(
            { x: 1, y: 1 },
            250,
            Phaser.Easing.Exponential.Out,
            true,
            config.animations.SLIDE_START_DELAY
          );
        word.pushUp(0);

        if (word.letterObjects && word.letterObjects[0]) {
          word.letterObjects[0].addColor("#F1E4D4", 0);
          word.letterObjects[0].alpha = 1;
        }

        // Set the style for the current letter
        word.setStyle(0);

        // Play the letter sound
        await this.playLetter(letter);

        // Show hint if needed
        if (this.letterScoreDict && this.letterScoreDict[letter] < config.app.LEARNED_THRESHOLD) {
          await word.showHint();
          await this.playHints(word.getCurrentLetter());
        }
      } catch (error) {
        console.error('Error animating first word:', error);
      }

      // Enable input
      this.inputReady = true;
      console.log('First word created successfully');
    } catch (error) {
      console.error('Error creating first word:', error);
      this.inputReady = true; // Make sure input is enabled even if there's an error
    }
  }

  // Set current pool to saved learned letters
  // Update progress lights
  loadLetters() {
    console.log('Loading letters');

    try {
      // Initialize letterScoreDict if it doesn't exist
      if (!this.letterScoreDict) {
        console.warn('Letter score dictionary not initialized, creating empty dictionary');
        this.letterScoreDict = {};
      }

      // Grab saved letters from previous states
      Object.keys(this.letterScoreDict).forEach((key) => {
        if (this.letterScoreDict[key] >= config.app.LEARNED_THRESHOLD) {
          this.currentLettersInPlay.push(key);
        }
      });

      console.log('Current letters in play:', this.currentLettersInPlay);

      // Make sure we have at least the first 3 letters in play
      if (this.currentLettersInPlay.length < 3) {
        // Use the first 3 letters from the course if available
        if (this.parent && this.parent.course && this.parent.course.lettersToLearn) {
          const firstThreeLetters = this.parent.course.lettersToLearn.slice(0, 3);

          // Add any missing letters
          firstThreeLetters.forEach(letter => {
            if (!this.currentLettersInPlay.includes(letter)) {
              this.currentLettersInPlay.push(letter);
            }
          });
        } else {
          // Use default letters if course is not available
          const defaultLetters = ['a', 'b', 'c'];
          defaultLetters.forEach(letter => {
            if (!this.currentLettersInPlay.includes(letter)) {
              this.currentLettersInPlay.push(letter);
            }
          });
        }

        console.log('Updated letters in play:', this.currentLettersInPlay);
      }

      // Update progress lights in the header
      setTimeout(() => {
        if (this.parent && this.parent.header) {
          this.parent.header.updateProgressLights(this.letterScoreDict);
          console.log('Progress lights updated');
        } else {
          console.warn('Header not available, could not update progress lights');
        }
      }, 0);
    } catch (error) {
      console.error('Error loading letters:', error);
    }
  }

  checkAddLetters() {
    let lastLetter;
    let newArray = [];

    // Need to wait for promise for letterScoreDict
    setTimeout(() => {
      const arrayIntersection = _.intersection(
        this.currentLettersInPlay,
        this.parent.course.lettersToLearn
      );

      for (let i = 0; i < arrayIntersection.length; i++) {
        if (
          this.letterScoreDict[arrayIntersection[i]] >=
          config.app.LEARNED_THRESHOLD
        ) {
          newArray.push(true);
        } else {
          newArray.push(false);
        }
      }

      // Get only the last 3 letters in play not including most recent new letter
      lastLetter = newArray[newArray.length - 1];

      // Check if last letter in play is true and got 3 or more in a row
      if (
        lastLetter &&
        this.consecutiveCorrect >= config.app.CONSECUTIVE_CORRECT
      ) {
        let oldLength = this.currentLettersInPlay.length;
        let newLength = oldLength + 1;
        this.consecutiveCorrect = 0;

        if (newLength > this.parent.course.lettersToLearn.length) {
          while (newLength > this.parent.course.lettersToLearn.length) {
            newLength--;
          }
        }

        this.currentLettersInPlay = this.parent.course.lettersToLearn.slice(
          0,
          newLength
        );
      }
    }, 200);
  }

  makeWordObject() {
    console.log('Making word object');

    try {
      let myWord = this.findAWord();
      let length = myWord.length;

      // Create a new word object
      let word = new Word(this.game);
      word.myLength = length;

      // Assign a color from our color arrays
      const colorIndex = this.currentWords.length % this.allBgColors.length;
      word.myColor = this.allBgColors[colorIndex];
      word.myColorString = this.allBgColorsString[colorIndex];

      // Set other properties
      word.row = 0;
      word.parent = this;
      word.gameParent = this.parent;

      // Create the word
      word.create(true, myWord);
      console.log('Word created:', myWord);

      // Check if we need to add more letters
      this.checkAddLetters();

      // Add the word to our list of current words
      this.currentWords.push(word);
      console.log('Current words count:', this.currentWords.length);
    } catch (error) {
      console.error('Error making word object:', error);
    }
  }

  addAWord() {
    this.makeWordObject();
    let priorIndex = this.currentWords.length - 2;

    // Calculate position for the new word based on the last letter of the previous word
    let lastLetterIndex = this.currentWords[priorIndex].myLetters.length - 1;
    let myStartX =
      this.currentWords[priorIndex].letterObjects[lastLetterIndex].position.x +
      config.app.wordBrickSize +
      config.app.spaceBetweenWords;

    this.currentWords[this.currentWords.length - 1].setPosition(myStartX);
  }

  // Check if all letters have been learned
  checkAllLettersLearned() {
    const totalLetters = this.parent.course.lettersToLearn.length;
    const learnedLetters = Object.keys(this.letterScoreDict).filter(
      key => this.letterScoreDict[key] >= config.app.LEARNED_THRESHOLD
    ).length;

    // If all letters are learned, show the congratulations screen
    if (learnedLetters === totalLetters) {
      // Save progress before transitioning
      this.parent.saveProgress();

      // Get analytics data from localStorage
      const analyticsData = localStorage.getItem('analyticsData')
        ? JSON.parse(localStorage.getItem('analyticsData'))
        : null;

      // Get the current course name
      const currentCourseName = Object.keys(config.courses).find(
        courseName => config.courses[courseName].storageKey === this.parent.course.storageKey
      ) || 'alphabet';

      // Transition to the congratulations state
      this.game.state.start('congratulations', true, false, {
        letterScoreDict: this.letterScoreDict,
        analyticsData: analyticsData,
        currentCourse: currentCourseName
      });
      return true;
    }

    return false;
  }

  async checkMatch(typedLetter) {
    if (!this.inputReady) {
      return;
    }
    this.inputReady = false;
    try {
      let word = this.currentWords[this.currentWordIndex];
      let letter = word.myLetters[word.currentLetterIndex];

      // Got a letter correct
      if (typedLetter === letter) {
        incrementCorrectCount(letter);

        this.mistakeCount = 0;
        this.consecutiveCorrect++;

        // Allow input during the correct animation and hints so the user can keep going without waiting
        this.inputReady = true;

        this.game.add
          .tween(word.pills[word.currentLetterIndex].scale)
          .to({ x: 0, y: 0 }, 500, Phaser.Easing.Back.In, true);

        word.pushDown(word.currentLetterIndex);
        word.currentLetterIndex++;
        this.letterScoreDict[letter] += 1;
        this.parent.saveProgress();

        if (this.letterScoreDict[letter] > config.app.LEARNED_THRESHOLD + 2) {
          this.letterScoreDict[letter] = config.app.LEARNED_THRESHOLD + 2;
        }
        if (this.game.have_speech_assistive) {
          await this.playCorrect();
        }

        // next
        if (word.currentLetterIndex >= word.myLetters.length) {
          this.currentWordIndex++;
          word.currentLetterIndex = 0;

          if (this.currentWordIndex > this.currentWords.length - 2) {
            this.addAWord();
          }

          // Update word backgrounds to highlight the current word
          this.updateWordBackgrounds();
        }

        this.slideLetters();


        word = this.currentWords[this.currentWordIndex];
        letter = word.myLetters[word.currentLetterIndex];
        let theLetterIndex = this.newLetterArray.indexOf(typedLetter);

        this.parent.header.updateProgressLights(
          this.letterScoreDict,
          theLetterIndex
        );

        // Check if all letters have been learned after updating progress
        if (this.checkAllLettersLearned()) {
          return; // Exit if we've transitioned to the congratulations screen
        }

        await this.playLetter(letter);
        if (this.letterScoreDict[letter] < config.app.LEARNED_THRESHOLD) {
          await word.showHint();
          await this.playHints(word.getCurrentLetter());
        }

      } else {
        // Got a letter wrong
        incrementWrongCount(letter);

        this.mistakeCount++;
        this.consecutiveCorrect = 0;

        this.letterScoreDict[letter] -= 1;
        word.shake(word.currentLetterIndex);

        // Allow input during the wrong animation and hints so the user can try again without waiting
        this.inputReady = true;

        if (this.game.have_speech_assistive) {
          await this.playWrong();
        }

        this.parent.header.updateProgressLights(this.letterScoreDict, letter);

        if (this.letterScoreDict[letter] < -config.app.LEARNED_THRESHOLD - 2) {
          this.letterScoreDict[letter] = -config.app.LEARNED_THRESHOLD - 2;
        }

        await word.setStyle(word.currentLetterIndex);
        await this.playLetter(letter);
        await word.showHint();
        await this.playHints(word.getCurrentLetter(), this.mistakeCount);
      }
    } catch (error) {
      console.error('Error in checkMatch:', error);
    } finally {
      this.inputReady = true;
    }
  }

  /**
   * Play the audio hints.
   *
   * @param {Letter} letter - The current letter.
   * @param {number} attempts - The number of failed attempts for the
   *   current turn.
   *
   * @returns {Promise<void>}
   */
  async playHints(letter, attempts = 0) {
    if (attempts % 4 === 0) {
      await this.playMorse(letter);
      await this.playLetterSoundAlike(letter);
    } else if (attempts % 4 === 1) {
      // No audio hint.
    } else if (attempts % 4 === 2) {
      await this.playMorse(letter);
    } else if (attempts % 4 === 3) {
      await this.playLetterSoundAlike(letter);
    }
  }

  async playWrong() {
    const timeout = this.game.customSoundManager.soundDuration('wrong')
    this.game.customSoundManager.playSound('wrong');
    await delay(timeout * 1000);
  }

  async playCorrect() {
    const timeout = this.game.customSoundManager.soundDuration('correct')
    this.game.customSoundManager.playSound('correct');
    await delay(timeout * 1000);
  }

  async playLetter(letter) {
    let name = this.parent.course.getLetterName(letter);
    if (this.game.have_speech_assistive) {
      const soundName = "letter-" + name;
      this.game.customSoundManager.playSound(soundName)
      let timeout = this.game.customSoundManager.soundDuration(soundName)
      await delay(timeout > 0 ? timeout * 1000 : 200);
    } else {
      await delay(750);
    }
  }

  /**
   * Play a letter's mnemonic.
   *
   * @param {Letter} letter - The current letter.
   *
   * @returns {Promise<void>}
   */
  async playLetterSoundAlike(letter) {
    let name = this.parent.course.getLetterName(letter.letter);
    if (this.game.have_speech_assistive) {
      await delay(300);
      const soundName = "soundalike-letter-" + name;
      this.game.customSoundManager.playSound(soundName)
      let timeout = this.game.customSoundManager.soundDuration(soundName)
      await delay(timeout > 0 ? timeout * 1000 : 200);
    }
  }

  /**
   * Play the letter in Morse code.
   *
   * @param {Letter} letter - The current letter.
   *
   * @returns {Promise<void>}
   */
  async playMorse(letter) {
    if (!this.game.have_audio) {
      return;
    }
    for (let i = 0; i < letter.morse.length; i++) {
      let tmp;
      if (letter.morse[i] === "\u002D") {
        tmp = {
          totalDuration: this.game.customSoundManager.soundDuration('dash')
        }
        this.game.customSoundManager.playSound('dash')
      } else if (letter.morse[i] === "\u002E") {
        tmp = {
          totalDuration: this.game.customSoundManager.soundDuration('period')
        }
        this.game.customSoundManager.playSound('period')
      }
      await delay(300);
      if (tmp) {
        await delay(Math.min(0.601, tmp.totalDuration) * 1000);
      }
    }
  }

  setWatchedVideo() {
    if (typeof Storage !== "undefined") {
      localStorage.setItem("intro", true);
    }
  }

  slideLetters() {
    return new Promise((resolve) => {
      const word = this.currentWords[this.currentWordIndex];
      const letterObject = word.letterObjects[word.currentLetterIndex];
      const target = this.game.world.centerX;
      const distBetweenTargetAndNextLetter = letterObject.position.x - target;

      for (let w = 0; w < this.currentWords.length; w++) {
        const bg = this.currentWords[w].background;
        const bgX = bg.position.x;

        for (let l = 0; l < this.currentWords[w].letterObjects.length; l++) {
          const letter = this.currentWords[w].letterObjects[l];
          const letterX = letter.position.x;
          const hint = this.currentWords[w].hints[l];
          const hintX = hint.text.x;
          const pill = this.currentWords[w].pills[l];
          const pillX = pill.position.x;

          this.game.add
            .tween(letter)
            .to(
              { x: letterX - distBetweenTargetAndNextLetter },
              config.animations.SLIDE_TRANSITION,
              Phaser.Easing.Exponential.Out,
              true,
              config.animations.SLIDE_END_DELAY
            );
          // Update the hint text to stay aligned with the letter
          // First update the y position to be below the visual cue
          const textHintOffset = config.hints.hintOffset || 120;
          const textVisualCueHeight = 150; // Approximate height of the visual cue image

          // Determine the vertical position based on whether the letter is pushed up
          let textY;
          const letterChar = this.currentWords[w].letterObjects[l].letter;

          if (this.letterScoreDict[letterChar] < config.app.LEARNED_THRESHOLD) {
            textY = config.GLOBALS.worldTop + textHintOffset + textVisualCueHeight + 20;
          } else {
            textY = config.GLOBALS.worldCenter + textHintOffset + textVisualCueHeight + 20;
          }

          hint.text.position.y = textY;

          this.game.add
            .tween(hint.text)
            .to(
              { x: letterX - distBetweenTargetAndNextLetter },
              config.animations.SLIDE_TRANSITION,
              Phaser.Easing.Exponential.Out,
              true,
              config.animations.SLIDE_END_DELAY
            );

          // Also update the hint image position to match the letter exactly
          // This ensures the hint image stays centered under the letter during animation
          this.game.add
            .tween(hint.image)
            .to(
              { x: letterX - distBetweenTargetAndNextLetter },
              config.animations.SLIDE_TRANSITION,
              Phaser.Easing.Exponential.Out,
              true,
              config.animations.SLIDE_END_DELAY
            );

          // Update the underline position to match the letter
          // This ensures the morse code indicator stays aligned with the letter
          if (hint.underline) {
            // For graphics objects, we need to update the position and redraw
            // First, clear the existing graphics
            hint.underline.clear();
            hint.underline.beginFill(0xF1E4D4, 1);

            // Get the morse code for this letter
            const morseCode = this.currentWords[w].letterObjects[l].morse;
            const newX = letterX - distBetweenTargetAndNextLetter;

            // Calculate the position for the morse code indicator
            // Position it below the hint text
            const morseHintOffset = config.hints.hintOffset || 120;
            const morseVisualCueHeight = 150; // Approximate height of the visual cue image

            // Determine the vertical position based on whether the letter is pushed up
            let morseTextY;
            const letter = this.currentWords[w].letterObjects[l];
            const letterChar = letter.letter;

            if (this.letterScoreDict[letterChar] < config.app.LEARNED_THRESHOLD) {
              morseTextY = config.GLOBALS.worldTop + morseHintOffset + morseVisualCueHeight + 20;
            } else {
              morseTextY = config.GLOBALS.worldCenter + morseHintOffset + morseVisualCueHeight + 20;
            }

            const morseY = morseTextY + 40; // Position it below the hint text

            // Draw the complete morse code representation
            if (morseCode) {
              const dotSize = 8; // Size of the dot
              const dashWidth = 24; // Width of the dash
              const dashHeight = 8; // Height of the dash
              const spacing = 12; // Spacing between elements

              // Calculate total width of the morse code visualization
              let totalWidth = 0;
              for (let j = 0; j < morseCode.length; j++) {
                if (morseCode[j] === '.') {
                  totalWidth += dotSize;
                } else if (morseCode[j] === '-') {
                  totalWidth += dashWidth;
                }

                // Add spacing between elements (except after the last one)
                if (j < morseCode.length - 1) {
                  totalWidth += spacing;
                }
              }

              // Start drawing from the left edge of the total width
              let startX = newX - (totalWidth / 2);

              // Draw each element of the morse code
              for (let j = 0; j < morseCode.length; j++) {
                if (morseCode[j] === '.') {
                  // Draw a dot (circle)
                  hint.underline.drawCircle(startX + (dotSize / 2), morseY, dotSize);
                  startX += dotSize + spacing;
                } else if (morseCode[j] === '-') {
                  // Draw a dash (rectangle)
                  hint.underline.drawRect(startX, morseY - 4, dashWidth, dashHeight);
                  startX += dashWidth + spacing;
                }
              }
            } else {
              // Fallback if no morse code is available
              hint.underline.drawRect(newX - 10, morseY - 4, 20, 4);
            }

            hint.underline.endFill();
          }
          this.game.add
            .tween(pill)
            .to(
              { x: pillX - distBetweenTargetAndNextLetter },
              config.animations.SLIDE_TRANSITION,
              Phaser.Easing.Exponential.Out,
              true,
              config.animations.SLIDE_END_DELAY
            );
        }

        this.game.add
          .tween(bg)
          .to(
            { x: bgX - distBetweenTargetAndNextLetter },
            config.animations.SLIDE_TRANSITION,
            Phaser.Easing.Exponential.Out,
            true,
            config.animations.SLIDE_END_DELAY
          );
      }

      // Set video as watched if user passes first word
      if (this.currentWordIndex > 0) {
        this.setWatchedVideo();
      }

      this.game.add
        .tween(word.pills[word.currentLetterIndex].scale)
        .to(
          { x: 1, y: 1 },
          250,
          Phaser.Easing.Exponential.Out,
          true,
          config.animations.SLIDE_END_DELAY + 200
        );

      setTimeout(resolve, config.animations.SLIDE_END_DELAY + 450);

      word.setStyle(word.currentLetterIndex);
    });
  }
}

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

const incrementAnalyticsCount = (key) => (letter) => {
  let analyticsData = localStorage.getItem('analyticsData');

  // If there is no analytics data set then  we set the default as the data
  if(!analyticsData) {
    localStorage.setItem('analyticsData', JSON.stringify(EMPTY_ANALYTICS))

    analyticsData = EMPTY_ANALYTICS;
  } else {
    // If it is set we need to parse it
    analyticsData = JSON.parse(analyticsData)
  }

  // Increment the wrong or correct count
  analyticsData[letter][key] = analyticsData[letter][key] + 1;

  // Save the update
  localStorage.setItem('analyticsData', JSON.stringify(analyticsData))
}

// Curried (HOC)
const incrementCorrectCount = incrementAnalyticsCount('correct')
const incrementWrongCount = incrementAnalyticsCount('wrong')

module.exports.GameSpace = GameSpace;
