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

class HeaderSpace {

  constructor(game) {
    this.game = game;
    this.parent = null;
    this.lettersProgress = [];
    this.letterCircles = [];
    this.headerGroup = this.game.add.group();
    this.headerGroup.position.y = -100;
    this.circlesGroup = this.game.add.group();
    this.circlesGroup.position.y = config.header.topPosition + 15;
  }

  updateProgressLights(score, letter) {
    this.saveLetters(score);

    // Loop through each learned letter and apply a little more opacity
    Object.keys(score).forEach((key) => {
      let currentAlpha = 0.3;

      if (score[key] && score[key] > 0 && score[key] <= (config.app.LEARNED_THRESHOLD * 2)) {
        switch(score[key]) {
          case 1:
            currentAlpha = 0.4;
            break;
          case 2:
            currentAlpha = 0.6;
            break;
          case 3:
            currentAlpha = 0.8;
            break;
          case 4:
            currentAlpha = 1;
            break;
          default:
            currentAlpha = 0.3;
        }

        setTimeout(() => {
          const matchingLetters = this.lettersProgress.filter(letter => letter.text && letter.text.toLowerCase() === key);
          if (matchingLetters && matchingLetters.length > 0 && matchingLetters[0]) {
            matchingLetters[0].alpha = currentAlpha;
          }
        }, 500);
      }
    });

    // Do circle animation
    if (this.letterCircles[letter] && typeof letter !== 'undefined') {
      this.game.add.tween(this.letterCircles[letter].scale).to({ x: 1.5, y: 1.5 }, 200, Phaser.Easing.Linear.In, true, 500);
      this.game.add.tween(this.letterCircles[letter]).to({ alpha: 0 }, 300, Phaser.Easing.Linear.In, true, 700).onComplete.add(() => {
        this.game.add.tween(this.letterCircles[letter].scale).to({ x: 0, y: 0 }, 10, Phaser.Easing.Linear.In, true);
        this.game.add.tween(this.letterCircles[letter]).to({ alpha: 1 }, 10, Phaser.Easing.Linear.In, true, 10);
      });
    }
  }

  createLetters() {
    console.log('Header space createLetters method called');

    try {
      // Use default alphabet if course is not properly initialized
      let lettersToLearn = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
      let spacing = 5;

      // Try to get letters from course if available
      if (this.parent && this.parent.course) {
        if (this.parent.course.headerSpacing) {
          spacing = this.parent.course.headerSpacing;
        }

        if (this.parent.course.lettersToLearn && this.parent.course.lettersToLearn.length > 0) {
          lettersToLearn = this.parent.course.lettersToLearn.slice(0);
        }
      } else {
        console.warn('Using default alphabet for header space');
      }

      lettersToLearn.sort();
      console.log('Letters to learn in header space:', lettersToLearn);

      for (let i = 0; i < lettersToLearn.length; i++) {
        const letter = this.game.add.text(i * (config.header.letterSize + spacing), 0, lettersToLearn[i].toUpperCase(), {
          align: 'center',
          boundsAlignH: 'center',
          boundsAlignV: 'middle'
        });
        // Set text bounds with proper spacing
        const letterSpacing = config.header.letterSpacing || 5;
        letter.setTextBounds(0, 0, config.header.letterSize - letterSpacing, config.header.letterSize - letterSpacing);
        letter.font = config.typography.font;
        letter.fontWeight = 700;
        letter.fontSize = config.header.letterSize;
        letter.addColor('#fff', 0);
        letter.alpha = 0.2;

        let circle = this.game.add.graphics(0, 0);
        circle.lineStyle(2, 0xffffff, 1);
        circle.drawCircle(0, 0, 50);

        // Apply consistent spacing between letters
        circle.position.x = i * (config.header.letterSize - letterSpacing);
        circle.scale.x = 0;
        circle.scale.y = 0;

        // Adjust spacing for mobile screens
        const isMobile = window.innerWidth < 480;
        const baseSpacing = isMobile ? 3 : 7;

        // Position individual letters with more consistent spacing
        if (i >= 13 && i < 22) {
          letter.position.x += baseSpacing;
          circle.position.x += baseSpacing;
        }

        if (i === 22) {
          letter.position.x += baseSpacing * 2;
          circle.position.x += baseSpacing * 2;
        } else if (i >= 23) {
          letter.position.x += baseSpacing * 3;
          circle.position.x += baseSpacing * 3;
        }

        this.headerGroup.add(letter);
        this.circlesGroup.add(circle);
        this.headerGroup.position.x = this.game.world.centerX - (this.headerGroup.width / 2);
        this.circlesGroup.position.x = this.game.world.centerX - (this.circlesGroup.width / 2);
        this.lettersProgress.push(letter);
        this.letterCircles.push(circle);
      }

      // Cta Button that links externally
      try {
        let ctaButton = this.game.add.button(this.game.world.centerX, 20, '', () => {
          this.clearProgress();
        });
        ctaButton.anchor.set(0.5, 0);
        ctaButton.width = this.headerGroup.width;
        ctaButton.height = this.headerGroup.height;
        ctaButton.alpha = 0;

        // Move button above all things
        this.buttonGroup = this.game.add.group();
        this.buttonGroup.add(ctaButton);
        this.game.world.bringToTop(this.buttonGroup);
        this.game.add.tween(this.headerGroup).to({ y: config.header.topPosition }, 800, Phaser.Easing.Exponential.Out, true, 400);
      } catch (error) {
        console.error('Error creating CTA button:', error);
      }
    } catch (error) {
      console.error('Error in createLetters method:', error);
    }
  }

  saveLetters(score) {
    if (typeof(Storage) !== 'undefined') {
      let key = this.parent.course.storageKey;
      localStorage.setItem(key, JSON.stringify(score));
    }
  }

  // Clear the current progress
  clearProgress() {
    if (typeof(Storage) !== 'undefined') {
      const confirm = window.confirm('Are you sure you want to clear your progress? This will restart your current game.');
      if (confirm) {
        localStorage.removeItem(this.parent.course.storageKey);
        localStorage.removeItem('intro');
        window.location.reload();
      }
    }
  }

  create() {
    console.log('Header space create method called');
    try {
      this.createLetters();
      console.log('Header space letters created successfully');

      // Make sure the header is at the top of the display list
      this.game.world.bringToTop(this.headerGroup);

      // Initialize with the current progress
      if (this.parent && this.parent.letterScoreDict) {
        this.updateProgressLights(this.parent.letterScoreDict);
      }
    } catch (error) {
      console.error('Error in header space create method:', error);
    }
  }

  // Update header position when window is resized
  updatePosition() {
    // Update the header group position
    this.headerGroup.position.x = this.game.world.centerX - (this.headerGroup.width / 2);

    // Make sure the header is visible
    if (this.headerGroup.position.y < 0) {
      this.game.add.tween(this.headerGroup).to({ y: config.header.topPosition }, 300, Phaser.Easing.Exponential.Out, true);
    } else {
      this.headerGroup.position.y = config.header.topPosition;
    }

    // Update the circles group position
    this.circlesGroup.position.x = this.game.world.centerX - (this.circlesGroup.width / 2);
    this.circlesGroup.position.y = config.header.topPosition + 15;
  }
}

module.exports.HeaderSpace = HeaderSpace;
