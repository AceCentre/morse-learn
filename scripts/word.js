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

const config = require('./config');
// Create our own delay function using setTimeout
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Word {

  constructor(game) {
    this.myLength = null;
    this.parent = null;
    this.currentLetterIndex = 0;
    this.game = game;
  }

  create(morseVisible, myWord) {
    this.myLetters = [];
    /** @type {Array<Letter>} */
    this.letterObjects = [];
    this.hints = [];
    this.pills = [];
    this.background = null;
    this.soundTimeout = null;

    for (let i = 0; i < this.myLength; i++) {
      this.myLetters.push(myWord[i])
    }
  }

  /** @returns {Letter} */
  getCurrentLetter() {
    return this.letterObjects[this.currentLetterIndex];
  }

  setPosition(startX) {
    let rect = this.game.add.graphics(0, 0);
    rect.beginFill(this.myColor);

    // Calculate the width of the background
    const bgWidth = (config.app.wordBrickSize * this.myLetters.length) + (config.app.wordBrickSize * 2);

    // For single letters, center the background around the startX position
    if (this.myLetters.length === 1) {
      rect.drawRect(startX - (bgWidth / 2), 0, bgWidth, 5000);
    } else {
      rect.drawRect(startX - config.app.wordBrickSize, 0, bgWidth, 5000);
    }

    rect.endFill();
    this.myStartX = startX;
    this.background = rect;

    // Move gameSpaceGroup to back
    this.parent.gameSpaceGroup.add(this.background);

    for (let i = 0; i < this.myLetters.length; i++) {
      let circle = this.game.add.graphics(0, 0);

      // Circle pill
      circle.beginFill(0x000000, 1);
      circle.drawCircle(0, 0, config.app.wordBrickSize);

      // For single letters, center the letter at the startX position
      // For multiple letters, position them relative to startX
      if (this.myLetters.length === 1) {
        circle.position.x = startX;
      } else {
        circle.position.x = startX + (i * config.app.wordBrickSize);
      }

      circle.position.y = config.GLOBALS.worldCenter;
      circle.alpha = 0.4;
      circle.scale.x = 0;
      circle.scale.y = 0;

      circle.endFill();
      this.pills.push(circle);

      /**
       * A game letter.
       *
       * @typedef {Phaser.Text} Letter
       *
       * @property {string} letter - The lowercase letter.
       * @property {string} morse - The letter in Morse code.
       */
      let name = this.parent.parent.course.getLetterName(this.myLetters[i]);

      // Use the same positioning logic as for the pills
      let letterX;
      if (this.myLetters.length === 1) {
        letterX = startX;
      } else {
        letterX = startX + (i * config.app.wordBrickSize);
      }

      let letter = this.game.add.text(letterX, config.GLOBALS.worldCenter, name.toUpperCase());
      letter.font = config.typography.font;
      letter.fontWeight = 600;
      letter.fontSize = config.app.wordLetterSize;
      letter.align = 'center';
      letter.anchor.set(0.5, 0.5);
      letter.alpha = 0.2;
      letter.morse = this.parent.parent.morseDictionary[this.myLetters[i]];
      letter.fill = '#000000';
      letter.letter = name;
      this.letterObjects.push(letter);

      // Use the letter-specific image from assets/images/final
      // The image keys are lowercase but the actual files are uppercase
      let hint;
      const hintOffset = config.hints.hintOffset || 120;

      // Always position the hint directly under the letter
      // Use the exact same x position as the letter for perfect alignment
      const hintX = letterX;
      const hintY = config.GLOBALS.worldCenter + hintOffset;

      try {
        // First check if the texture exists in the cache
        if (this.game.cache.checkImageKey(name.toLowerCase())) {
          hint = this.game.add.sprite(hintX, hintY, name.toLowerCase());
        } else {
          console.warn(`Texture for ${name.toLowerCase()} not found in cache, using nohint as fallback`);
          hint = this.game.add.sprite(hintX, hintY, 'nohint');
        }
      } catch (error) {
        console.warn(`Error creating sprite for ${name.toLowerCase()}, using nohint as fallback:`, error);
        hint = this.game.add.sprite(hintX, hintY, 'nohint');
      }

      hint.anchor.set(0.5, 0);
      hint.scale.set(config.hints.hintSize);
      hint.alpha = 0;

      // Log for debugging
      console.log(`Creating hint image for letter: ${name.toLowerCase()} at position ${letterX}`);

      // Double-check the texture loaded correctly
      if (!hint.texture || hint.texture.baseTexture.hasLoaded === false) {
        console.warn(`Failed to load texture for ${name.toLowerCase()}, using nohint as fallback`);
        hint.loadTexture('nohint');
      }


      // Hint Text
      // Use the letter name directly since we're using the 'nohint' image for all letters
      let hintName = name;

      // Position the hint text at the same x-coordinate as the letter for alignment
      // Position it below the visual cue mnemonic
      const initialHintOffset = config.hints.hintOffset || 120;
      const initialVisualCueHeight = 150; // Approximate height of the visual cue image
      const textY = config.GLOBALS.worldCenter + initialHintOffset + initialVisualCueHeight + 20; // Position it below the visual cue
      let hintText = this.game.add.text(letterX, textY, hintName);
      hintText.font = config.typography.font;
      hintText.fontSize = config.hints.hintTextSize;
      hintText.fontWeight = 700;
      hintText.align = 'center';
      hintText.anchor.set(0.5, 0.5); // Center the text horizontally
      hintText.addColor('#F1E4D4', 0);
      hintText.alpha = 0;

      // Get the morse code for this letter
      const morseCode = this.parent.parent.morseDictionary[this.myLetters[i]];

      // Create a visual representation of the morse code (dots and dashes)
      let hintLine = this.game.add.graphics(0, 0);
      hintLine.beginFill(0xF1E4D4, 1);

      // Calculate the position for the morse code indicator
      // Position it below the hint text
      const morseY = textY + 40; // Position it below the hint text

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
        let startX = letterX - (totalWidth / 2);

        // Draw each element of the morse code
        for (let j = 0; j < morseCode.length; j++) {
          if (morseCode[j] === '.') {
            // Draw a dot (circle)
            hintLine.drawCircle(startX + (dotSize / 2), morseY, dotSize);
            startX += dotSize + spacing;
          } else if (morseCode[j] === '-') {
            // Draw a dash (rectangle)
            hintLine.drawRect(startX, morseY - 4, dashWidth, dashHeight);
            startX += dashWidth + spacing;
          }
        }
      } else {
        // Fallback if no morse code is available
        hintLine.drawRect(letterX - 10, morseY - 4, 20, 4);
      }

      hintLine.alpha = 0;
      hintLine.endFill();

      this.hints.push({
        image: hint,
        text: hintText,
        underline: hintLine
      });
    }
  }

  shake(index) {
    this.game.add.tween(this.letterObjects[index]).to({ x: this.letterObjects[index].x - 20 }, 100, Phaser.Easing.Bounce.In, true).onComplete.add(() => {
      this.game.add.tween(this.letterObjects[index]).to({ x: this.letterObjects[index].x + 40 }, 100, Phaser.Easing.Bounce.In, true).onComplete.add(() => {
        this.game.add.tween(this.letterObjects[index]).to({ x: this.letterObjects[index].x - 20 }, 100, Phaser.Easing.Bounce.In, true);
      });
    });

    this.game.add.tween(this.pills[index]).to({ x: this.pills[index].x - 20 }, 100, Phaser.Easing.Bounce.In, true).onComplete.add(() => {
      this.game.add.tween(this.pills[index]).to({ x: this.pills[index].x + 40 }, 100, Phaser.Easing.Bounce.In, true).onComplete.add(() => {
        this.game.add.tween(this.pills[index]).to({ x: this.pills[index].x - 20 }, 100, Phaser.Easing.Bounce.In, true);
      });
    });
  }

  async showHint() {
    if (this.hints.length !== 0) {
      await delay(config.animations.SLIDE_END_DELAY + 400);
      console.log('showHint - visual cues enabled:', this.game.have_visual_cues);

      // Get the current letter
      const currentLetter = this.myLetters[this.currentLetterIndex];
      const letterName = this.parent.parent.course.getLetterName(currentLetter);
      const imageKey = letterName.toLowerCase();

      if (this.game.have_visual_cues) {
        // Make sure the image is using the correct texture
        const hintImage = this.hints[this.currentLetterIndex].image;
        const currentLetterObj = this.letterObjects[this.currentLetterIndex];

        // Try to load the correct texture if it's not already loaded
        if (hintImage.key !== imageKey) {
          try {
            // First check if the texture exists in the cache
            if (this.game.cache.checkImageKey(imageKey)) {
              hintImage.loadTexture(imageKey);
            } else {
              console.warn(`Texture for ${imageKey} not found in cache, using nohint as fallback`);
              hintImage.loadTexture('nohint');
            }
          } catch (error) {
            console.warn(`Failed to load texture for ${imageKey}, using nohint as fallback:`, error);
            hintImage.loadTexture('nohint');
          }
        }

        // Add a small delay to ensure texture is loaded before showing
        await delay(50);

        // Position the hint image directly under the current letter
        // Make sure the x position exactly matches the letter for proper alignment
        hintImage.position.x = currentLetterObj.position.x;

        // Position the hint image below the letter (with a small offset)
        const imageHintOffset = config.hints.hintOffset || 120;

        // If the letter is pushed up, position the hint below it
        if (this.parent.letterScoreDict[currentLetter] < config.app.LEARNED_THRESHOLD) {
          hintImage.position.y = config.GLOBALS.worldTop + imageHintOffset;
        } else {
          hintImage.position.y = config.GLOBALS.worldCenter + imageHintOffset;
        }

        // Show the hint image with increased delay to ensure texture is loaded
        this.game.add.tween(hintImage).to({ alpha: 1 }, 200, Phaser.Easing.Linear.In, true, 100);

        // Also show the hint text and underline for better visibility
        // Position the hint text at the same x-coordinate as the letter
        this.hints[this.currentLetterIndex].text.position.x = currentLetterObj.position.x;

        // Position the hint text below the visual cue mnemonic
        const textHintOffset = config.hints.hintOffset || 120;
        const visualCueHeight = 150; // Approximate height of the visual cue image

        // If the letter is pushed up, position the hint text below the pushed up letter and visual cue
        let textY;
        if (this.parent.letterScoreDict[currentLetter] < config.app.LEARNED_THRESHOLD) {
          textY = config.GLOBALS.worldTop + textHintOffset + visualCueHeight + 20;
        } else {
          textY = config.GLOBALS.worldCenter + textHintOffset + visualCueHeight + 20;
        }

        this.hints[this.currentLetterIndex].text.position.y = textY;
        this.game.add.tween(this.hints[this.currentLetterIndex].text).to({ alpha: 1 }, 200, Phaser.Easing.Linear.In, true);

        // Update the underline position and shape based on the morse code
        const underline = this.hints[this.currentLetterIndex].underline;
        underline.clear();
        underline.beginFill(0xF1E4D4, 1);

        // Get the morse code for this letter
        const morseCode = currentLetterObj.morse;
        const letterX = currentLetterObj.position.x;

        // Calculate the position for the morse code indicator
        // Position it below the hint text
        const morseY = textY + 40; // Position it below the hint text

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
          let startX = letterX - (totalWidth / 2);

          // Draw each element of the morse code
          for (let j = 0; j < morseCode.length; j++) {
            if (morseCode[j] === '.') {
              // Draw a dot (circle)
              underline.drawCircle(startX + (dotSize / 2), morseY, dotSize);
              startX += dotSize + spacing;
            } else if (morseCode[j] === '-') {
              // Draw a dash (rectangle)
              underline.drawRect(startX, morseY - 4, dashWidth, dashHeight);
              startX += dashWidth + spacing;
            }
          }
        } else {
          // Fallback if no morse code is available
          underline.drawRect(letterX - 10, morseY - 4, 20, 4);
        }

        underline.endFill();
        this.game.add.tween(underline).to({ alpha: 1 }, 200, Phaser.Easing.Linear.In, true);
      } else {
        // Make sure hints are hidden when visual cues are disabled
        this.game.add.tween(this.hints[this.currentLetterIndex].image).to({ alpha: 0 }, 200, Phaser.Easing.Linear.In, true);
        this.game.add.tween(this.hints[this.currentLetterIndex].text).to({ alpha: 0 }, 200, Phaser.Easing.Linear.In, true);
        this.game.add.tween(this.hints[this.currentLetterIndex].underline).to({ alpha: 0 }, 200, Phaser.Easing.Linear.In, true);
      }
    }
  }

  setStyle(i) {
    this.pushUp(i);
    this.game.add.tween(this.letterObjects[i]).to({ alpha: 1 }, 200, Phaser.Easing.Linear.Out, true, config.animations.SLIDE_END_DELAY + 200);

    setTimeout(() => {
      this.letterObjects[i].addColor('#F1E4D4', 0);
    }, config.animations.SLIDE_END_DELAY + 200);
  }

  pushUp(i) {
    console.log('pushUp - visual cues enabled:', this.game.have_visual_cues);
    if (this.parent.letterScoreDict[this.myLetters[i]] < config.app.LEARNED_THRESHOLD) {
      if (this.game.have_visual_cues) {
        // Move the letter and pill up when visual cues are enabled
        this.game.add.tween(this.letterObjects[i]).to({ y: config.GLOBALS.worldTop }, 400, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_END_DELAY + 200);
        this.game.add.tween(this.pills[i]).to({ y: config.GLOBALS.worldTop }, 400, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_END_DELAY + 200);

        // If this is the current letter, also update the hint image position
        if (i === this.currentLetterIndex && this.hints[i] && this.hints[i].image) {
          const pushUpHintOffset = config.hints.hintOffset || 120;
          // Position the hint image below the letter
          this.hints[i].image.position.x = this.letterObjects[i].position.x;
          this.game.add.tween(this.hints[i].image).to({ y: config.GLOBALS.worldTop + pushUpHintOffset }, 400, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_END_DELAY + 200);
        }
      } else {
        // Make sure they stay in the center when visual cues are disabled
        this.game.add.tween(this.letterObjects[i]).to({ y: config.GLOBALS.worldCenter }, 400, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_END_DELAY + 200);
        this.game.add.tween(this.pills[i]).to({ y: config.GLOBALS.worldCenter }, 400, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_END_DELAY + 200);
      }
    }
  }

  pushDown(i) {
    clearTimeout(this.soundTimeout);
    this.game.customSoundManager.stopSound('period');
    this.game.customSoundManager.stopSound('dash');

    this.game.add.tween(this.letterObjects[i]).to({ y: config.GLOBALS.worldCenter }, 200, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_START_DELAY);
    this.game.add.tween(this.pills[i]).to({ y: config.GLOBALS.worldCenter }, 200, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_START_DELAY);

    // Update the hint image position to match the letter's x position
    this.hints[i].image.position.x = this.letterObjects[i].position.x;

    // Update the hint text position to match the letter
    this.hints[i].text.position.x = this.letterObjects[i].position.x;

    const pushDownHintOffset = config.hints.hintOffset || 120;
    this.game.add.tween(this.hints[i].image).to({ y: config.GLOBALS.worldCenter + pushDownHintOffset, alpha: 0 }, 200, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_START_DELAY);
    this.game.add.tween(this.hints[i].text).to({ alpha: 0 }, 200, Phaser.Easing.Linear.In, true);
    this.game.add.tween(this.hints[i].underline).to({ alpha: 0 }, 200, Phaser.Easing.Linear.In, true);
  }
}

module.exports.Word = Word;
