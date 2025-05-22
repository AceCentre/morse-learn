// Copyright 2023 AceCentre
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

import config from './config';
import { delay } from './utils';
import confetti from 'canvas-confetti';

class CongratulationsState {
  constructor(game, course) {
    this.course = course;
    this.letterScoreDict = {};
    this.game = game;
    this.hasStarted = false;
    this.confettiParticles = [];
    this.analyticsData = null;
  }

  init(params) {
    this.letterScoreDict = params.letterScoreDict || {};
    this.analyticsData = params.analyticsData || null;
    this.currentCourse = params.currentCourse || 'alphabet';
  }

  create() {
    // Create background
    this.createBackground();

    // Create congratulations text and animations
    this.createCongratulationsText();

    // Create confetti animation
    this.createConfetti();

    // Create buttons
    this.createButtons();

    // Play celebration sound
    if (this.game.have_audio) {
      this.game.customSoundManager.playSound('correct');
    }

    // Hide the about button
    document.getElementById("button").style.display = "none";

    // Show the stats button
    this.showStatsButton();
  }

  createBackground() {
    // Create a colorful background
    let rect = this.game.add.graphics(0, 0);
    rect.beginFill(0x00a651, 1); // Green background for celebration
    rect.drawRect(0, 0, this.game.world.width, this.game.world.height, 5000);
    rect.endFill();

    // Add a decorative circle
    let circle = this.game.add.graphics(0, 0);
    circle.beginFill(0x000000, 1);
    circle.drawCircle(0, 0, config.title.mainFontSize * 3);
    circle.alpha = 0.2;
    circle.anchor.set(0.5, 0.5);
    circle.position.x = this.game.world.centerX;
    circle.position.y = this.game.world.centerY + (config.title.titleOffset);
    circle.scale.x = 0;
    circle.scale.y = 0;
    circle.endFill();

    // Animate the circle
    this.game.add.tween(circle.scale)
      .to({ x: 1, y: 1 }, 1000, Phaser.Easing.Elastic.Out, true, 300);
  }

  createCongratulationsText() {
    // Get the current course config
    const currentCourseConfig = config.courses[this.currentCourse];

    // Main congratulations text - customize based on course
    let congratsText;
    if (this.currentCourse === 'alphabet') {
      congratsText = "Congratulations!\nYou've learned the\nMorse Code Alphabet!";
    } else if (this.currentCourse === 'numbers') {
      congratsText = "Congratulations!\nYou've learned\nMorse Code Numbers!";
    } else {
      congratsText = "Congratulations!\nYou've completed\nthis Morse Code level!";
    }

    let title = this.game.add.text(
      this.game.world.centerX,
      this.game.world.centerY + (config.title.titleOffset),
      congratsText,
      {
        align: "center",
      }
    );
    title.lineSpacing = -10;
    title.fill = "#F1E4D4";
    title.fontSize = config.title.mainFontSize;
    title.anchor.setTo(0.5);
    title.font = config.typography.font;

    // Add a subtitle with stats
    const totalLetters = Object.keys(this.letterScoreDict).length;
    const learnedLetters = Object.keys(this.letterScoreDict).filter(
      key => this.letterScoreDict[key] >= config.app.LEARNED_THRESHOLD
    ).length;

    // Customize stats text based on course
    let itemType = 'letters';
    if (this.currentCourse === 'numbers') {
      itemType = 'numbers';
    } else if (this.currentCourse === 'keyboard') {
      itemType = 'keys';
    }

    const statsText = `You've mastered ${learnedLetters} out of ${totalLetters} ${itemType}!`;
    let stats = this.game.add.text(
      this.game.world.centerX,
      this.game.world.centerY + config.title.titleOffset + 150,
      statsText,
      {
        align: "center",
      }
    );
    stats.fontSize = config.title.startButtonSize * 0.7;
    stats.fill = "#F1E4D4";
    stats.anchor.setTo(0.5);
    stats.font = config.typography.font;

    // Animate the stats text
    const statsTween = this.game.add.tween(stats)
      .to({ alpha: 0.7 }, 800, "Linear", true, 0, -1);
    statsTween.yoyo(true, 0);
  }

  createConfetti() {
    // Create a canvas for the confetti
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';
    document.body.appendChild(canvas);

    // Store the canvas for later removal
    this.confettiCanvas = canvas;

    // Create the confetti instance
    const myConfetti = confetti.create(canvas, { resize: true });

    // Fire the confetti
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    // Initial burst
    myConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Continuous confetti
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      // Launch confetti from the sides
      myConfetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });

      myConfetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 150);
  }

  updateConfetti() {
    // Not needed with canvas-confetti library
  }

  createButtons() {
    // Check if there's a next course defined
    const currentCourseConfig = config.courses[this.currentCourse];
    const hasNextCourse = currentCourseConfig && currentCourseConfig.nextCourse;

    // Position variables
    let buttonY = this.game.world.height - 150;
    const buttonSpacing = 70;

    if (hasNextCourse) {
      // Next Level button
      const nextLevelText = "Next Level: Numbers";
      let nextLevelButton = this.game.add.text(
        this.game.world.centerX,
        buttonY,
        nextLevelText,
        {
          align: "center",
        }
      );
      nextLevelButton.fontSize = config.title.startButtonSize;
      nextLevelButton.fill = "#F1E4D4";
      nextLevelButton.anchor.setTo(0.5);
      nextLevelButton.font = config.typography.font;
      nextLevelButton.inputEnabled = true;
      nextLevelButton.events.onInputDown.add(this.goToNextLevel, this);

      // Animate the next level button
      const nextLevelTween = this.game.add.tween(nextLevelButton)
        .to({ alpha: 0.6 }, 600, "Linear", true, 0, -1);
      nextLevelTween.yoyo(true, 0);

      buttonY += buttonSpacing;
    }

    // Continue button (only show if there's no next course or as a secondary option)
    const continueText = hasNextCourse ? "Continue Current Level" : "Continue Learning";
    let continueButton = this.game.add.text(
      this.game.world.centerX,
      buttonY,
      continueText,
      {
        align: "center",
      }
    );
    continueButton.fontSize = hasNextCourse ? config.title.startButtonSize * 0.8 : config.title.startButtonSize;
    continueButton.fill = "#F1E4D4";
    continueButton.anchor.setTo(0.5);
    continueButton.font = config.typography.font;
    continueButton.inputEnabled = true;
    continueButton.events.onInputDown.add(this.continueLearning, this);

    // Animate the continue button
    const continueTween = this.game.add.tween(continueButton)
      .to({ alpha: 0.6 }, 600, "Linear", true, 0, -1);
    continueTween.yoyo(true, 0);

    buttonY += buttonSpacing;

    // View stats button
    const statsText = "View Statistics";
    let statsButton = this.game.add.text(
      this.game.world.centerX,
      buttonY,
      statsText,
      {
        align: "center",
      }
    );
    statsButton.fontSize = config.title.startButtonSize * 0.7;
    statsButton.fill = "#F1E4D4";
    statsButton.anchor.setTo(0.5);
    statsButton.font = config.typography.font;
    statsButton.inputEnabled = true;
    statsButton.events.onInputDown.add(this.showStatistics, this);
  }

  showStatsButton() {
    try {
      // Create a stats button that will be visible in the game state
      const statsButton = document.createElement('a');
      statsButton.href = '#';
      statsButton.title = 'View Statistics';
      statsButton.className = 'item stats-button';
      statsButton.innerHTML = '<i class="fa fa-2x fa-chart-bar"></i><span>View Statistics</span>';
      statsButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showStatistics();
      });

      // Make sure the button group exists
      let btnGroup = document.querySelector('.tl-btn-group');
      if (!btnGroup) {
        console.log('Creating .tl-btn-group element');
        btnGroup = document.createElement('div');
        btnGroup.className = 'tl-btn-group';
        btnGroup.style.display = 'flex'; // Make sure it's visible
        document.body.appendChild(btnGroup);
      }

      // Append the stats button
      btnGroup.appendChild(statsButton);
    } catch (error) {
      console.error('Error in showStatsButton method:', error);
    }
  }

  continueLearning() {
    // Return to the game state with the current course
    this.game.state.start('game', true, false, this.letterScoreDict);
  }

  goToNextLevel() {
    // Get the next course from the current course config
    const currentCourseConfig = config.courses[this.currentCourse];
    if (currentCourseConfig && currentCourseConfig.nextCourse) {
      const nextCourseName = currentCourseConfig.nextCourse;
      const nextCourse = config.courses[nextCourseName];

      if (nextCourse) {
        // Create a new Course instance with the next course config
        const Course = require('./course').Course;
        const newCourse = new Course(nextCourse);

        // Update the global course
        window.GameApp.course = newCourse;

        // Reset the letter score dictionary for the new course
        const newLetterScoreDict = {};
        newCourse.lettersToLearn.forEach(letter => {
          newLetterScoreDict[letter] = 0;
        });

        // Save the current course progress before switching
        if (typeof Storage !== "undefined") {
          localStorage.setItem(currentCourseConfig.storageKey, JSON.stringify(this.letterScoreDict));
        }

        // Start the game with the new course
        this.game.state.start('game', true, false, newLetterScoreDict);
      }
    }
  }

  showStatistics() {
    // Show statistics overlay
    this.createStatisticsOverlay();
  }

  createStatisticsOverlay() {
    // Create a statistics overlay similar to the about overlay
    const overlay = document.createElement('div');
    overlay.id = 'statistics-overlay';
    overlay.className = 'open';
    // We'll use the CSS from style.scss instead of inline styles

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Your Learning Statistics';

    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close statistics');
    closeButton.innerHTML = `<img src="${window.GameApp.assetPaths.close}" alt="Close">`;
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

  createStatisticsContent() {
    const container = document.createElement('div');

    // Get analytics data from localStorage
    let analyticsData = this.analyticsData;
    if (!analyticsData) {
      const storedData = localStorage.getItem('analyticsData');
      analyticsData = storedData ? JSON.parse(storedData) : null;
    }

    if (!analyticsData) {
      const noData = document.createElement('p');
      noData.textContent = 'No detailed statistics available.';
      container.appendChild(noData);
      return container;
    }

    // Create a summary paragraph
    const summary = document.createElement('p');
    const totalLetters = Object.keys(this.letterScoreDict).length;
    const learnedLetters = Object.keys(this.letterScoreDict).filter(
      key => this.letterScoreDict[key] >= config.app.LEARNED_THRESHOLD
    ).length;

    // Customize stats text based on course
    let itemType = 'letters';
    if (this.currentCourse === 'numbers') {
      itemType = 'numbers';
    } else if (this.currentCourse === 'keyboard') {
      itemType = 'keys';
    }

    summary.textContent = `You've mastered ${learnedLetters} out of ${totalLetters} ${itemType}. Here's a breakdown of your progress:`;
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

    // Customize header based on course
    let firstColumnHeader = 'Letter';
    if (this.currentCourse === 'numbers') {
      firstColumnHeader = 'Number';
    } else if (this.currentCourse === 'keyboard') {
      firstColumnHeader = 'Key';
    }

    [firstColumnHeader, 'Status', 'Correct', 'Wrong', 'Accuracy'].forEach(text => {
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

module.exports.CongratulationsState = CongratulationsState;
