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
    rect.drawRect(startX - config.app.wordBrickSize, 0, (config.app.wordBrickSize * this.myLetters.length) + (config.app.wordBrickSize * 2), 5000);
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
      circle.position.x = startX + (i * config.app.wordBrickSize);
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
      let letter = this.game.add.text(startX + (i * config.app.wordBrickSize), config.GLOBALS.worldCenter, name.toUpperCase());
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
      const hintX = startX + (i * config.app.wordBrickSize);
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
      console.log(`Creating hint image for letter: ${name.toLowerCase()} at position ${startX + (i * config.app.wordBrickSize)}`);

      // Double-check the texture loaded correctly
      if (!hint.texture || hint.texture.baseTexture.hasLoaded === false) {
        console.warn(`Failed to load texture for ${name.toLowerCase()}, using nohint as fallback`);
        hint.loadTexture('nohint');
      }


      // Hint Text
      // Use the letter name directly since we're using the 'nohint' image for all letters
      let hintName = name;
      let hintText = this.game.add.text(config.app.wordBrickSize, config.GLOBALS.worldBottom - 10, hintName);
      hintText.font = config.typography.font;
      hintText.fontSize = config.hints.hintTextSize;
      hintText.fontWeight = 700;
      hintText.align = 'center';
      hintText.anchor.set(0.5, 0.5);
      hintText.addColor('#F1E4D4', 0);
      hintText.alpha = 0;
      const hintTextWidth = hintText.width / 2;

      // Just get width of first letter for underline
      let hintLetter = this.game.add.text(config.app.wordBrickSize, config.GLOBALS.worldBottom - 10, hintName[0]);
      hintLetter.visible = false;
      hintLetter.font = config.typography.font;
      hintLetter.fontSize = config.hints.hintTextSize;
      hintLetter.fontWeight = 700;

      let hintLine = this.game.add.graphics(0, 0);
      hintLine.beginFill(0xF1E4D4, 1);
      hintLine.drawRect(hintLetter.position.x - hintTextWidth, hintLetter.position.y + 20, hintLetter.width, 4);
      hintLine.anchor.set(0.5, 0.5);
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
        // First update the x position to match the letter
        hintImage.position.x = currentLetterObj.position.x;

        // Position the hint image below the letter (with a small offset)
        const hintOffset = config.hints.hintOffset || 120;

        // If the letter is pushed up, position the hint below it
        if (this.parent.letterScoreDict[currentLetter] < config.app.LEARNED_THRESHOLD) {
          hintImage.position.y = config.GLOBALS.worldTop + hintOffset;
        } else {
          hintImage.position.y = config.GLOBALS.worldCenter + hintOffset;
        }

        // Show the hint image with increased delay to ensure texture is loaded
        this.game.add.tween(hintImage).to({ alpha: 1 }, 200, Phaser.Easing.Linear.In, true, 100);

        // Also show the hint text and underline for better visibility
        this.game.add.tween(this.hints[this.currentLetterIndex].text).to({ alpha: 1 }, 200, Phaser.Easing.Linear.In, true);
        this.game.add.tween(this.hints[this.currentLetterIndex].underline).to({ alpha: 1 }, 200, Phaser.Easing.Linear.In, true);
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
          const hintOffset = config.hints.hintOffset || 120;
          // Position the hint image below the letter
          this.hints[i].image.position.x = this.letterObjects[i].position.x;
          this.game.add.tween(this.hints[i].image).to({ y: config.GLOBALS.worldTop + hintOffset }, 400, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_END_DELAY + 200);
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

    const hintOffset = config.hints.hintOffset || 120;
    this.game.add.tween(this.hints[i].image).to({ y: config.GLOBALS.worldCenter + hintOffset, alpha: 0 }, 200, Phaser.Easing.Exponential.Out, true, config.animations.SLIDE_START_DELAY);
    this.game.add.tween(this.hints[i].text).to({ alpha: 0 }, 200, Phaser.Easing.Linear.In, true);
    this.game.add.tween(this.hints[i].underline).to({ alpha: 0 }, 200, Phaser.Easing.Linear.In, true);
  }
}

module.exports.Word = Word;
