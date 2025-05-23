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
    console.log('Congratulations state init called with params:', params);
    this.letterScoreDict = params.letterScoreDict || {};
    this.analyticsData = params.analyticsData || null;
    this.currentCourse = params.currentCourse || 'alphabet';

    // Make sure the course is properly initialized
    if (!this.game.course) {
      console.log('Game course not initialized, using global course');
      if (window.GameApp && window.GameApp.course) {
        this.game.course = window.GameApp.course;
      } else {
        console.log('Creating default course in congratulations state');
        const Course = require('./course').Course;
        this.game.course = new Course(config.courses[this.currentCourse]);
      }
    }

    // Update the course property
    this.course = this.game.course;
    console.log('Congratulations state initialized with course:', this.currentCourse);
  }

  create() {
    // Hide the morse board if it's visible
    this.hideMorseBoard();

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
    document.getElementById('button').style.display = 'none';

    // Show the stats button
    this.showStatsButton();
  }

  // Helper method to hide the morse board
  hideMorseBoard() {
    // Hide the main morse board
    const morseBoard = document.getElementById('morseboard');
    if (morseBoard) {
      // Store the current display state to restore it later if needed
      this.previousMorseBoardDisplay = morseBoard.style.display;
      morseBoard.style.display = 'none';

      // Also store the hidden state in localStorage to maintain consistency
      localStorage.setItem('morseboard_hidden', 'true');
    }

    // Also hide any other morse-related elements that might overlap
    const morseElements = document.querySelectorAll('.morse-element');
    morseElements.forEach(element => {
      if (element) {
        element.style.display = 'none';
      }
    });

    // Hide the morse keyboard if it exists
    const morseKeyboard = document.getElementById('morse-keyboard');
    if (morseKeyboard) {
      morseKeyboard.style.display = 'none';
    }

    // Force a layout recalculation to ensure proper spacing
    if (this.game && this.game.scale) {
      this.game.scale.refresh();
    }
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
    // Clear any existing text elements first
    this.game.world.children.forEach(child => {
      if (child.type === Phaser.TEXT) {
        child.destroy();
      }
    });

    // Calculate responsive positions based on screen size
    const isMobile = window.innerWidth < 480;

    // Create a container for all text elements
    const textContainer = this.game.add.group();

    // Calculate the available height for content
    const morseboardHeight = document.getElementById('morseboard') ?
      (document.getElementById('morseboard').offsetHeight || 0) : 0;

    // Calculate the usable screen height (excluding morse board if visible)
    const usableHeight = this.game.world.height - morseboardHeight;

    // Calculate vertical spacing
    const verticalSpacing = isMobile ?
      Math.floor(usableHeight / 10) :
      Math.floor(usableHeight / 8);

    // Calculate positions for each element
    const starY = verticalSpacing * 1.5;
    const titleY = verticalSpacing * 3;
    const statsY = verticalSpacing * 4.5;
    const instructionY = verticalSpacing * 5.5;

    // Adjust font sizes for different screen sizes
    const titleFontSize = isMobile ?
      Math.min(Math.floor(window.innerWidth / 12), 40) :
      Math.min(Math.floor(window.innerWidth / 10), 60);

    const statsFontSize = isMobile ?
      Math.min(Math.floor(window.innerWidth / 20), 22) :
      Math.min(Math.floor(window.innerWidth / 18), 28);

    const instructionFontSize = isMobile ?
      Math.min(Math.floor(window.innerWidth / 24), 18) :
      Math.min(Math.floor(window.innerWidth / 22), 22);

    // Create a simple star shape
    const star = this.game.add.graphics(0, 0);
    star.beginFill(0xFFD700, 1); // Gold color

    // Draw a simple star shape
    const centerX = 0;
    const centerY = 0;
    const spikes = 5;
    const outerRadius = isMobile ? 20 : 30;
    const innerRadius = isMobile ? 10 : 15;

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (spikes * 2)) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      if (i === 0) {
        star.moveTo(x, y);
      } else {
        star.lineTo(x, y);
      }
    }

    star.endFill();
    star.position.x = this.game.world.centerX;
    star.position.y = starY;

    // Add the star to the game world
    this.game.world.add(star);

    // Animate the star
    this.game.add.tween(star.scale)
      .to({ x: 1.2, y: 1.2 }, 800, Phaser.Easing.Elastic.Out, true, 300)
      .onComplete.add(() => {
        this.game.add.tween(star)
          .to({ alpha: 0.8 }, 600, 'Linear', true, 0, -1)
          .yoyo(true, 0);
      });

    // Main congratulations text - customize based on course
    let congratsText;
    if (this.currentCourse === 'alphabet') {
      congratsText = 'Congratulations!';
    } else if (this.currentCourse === 'numbers') {
      congratsText = 'Congratulations!';
    } else {
      congratsText = 'Congratulations!';
    }

    // Create the main title
    let title = this.game.add.text(
      this.game.world.centerX,
      titleY,
      congratsText,
      {
        align: 'center',
      }
    );
    title.fill = '#F1E4D4';
    title.fontSize = titleFontSize;
    title.anchor.setTo(0.5);
    title.font = config.typography.font;
    title.alpha = 0;

    // Animate the title with a bounce effect
    this.game.add.tween(title)
      .to({ alpha: 1 }, 800, Phaser.Easing.Bounce.Out, true, 500);

    // Create the subtitle based on course
    let subtitleText;
    if (this.currentCourse === 'alphabet') {
      subtitleText = 'You\'ve learned the Morse Code Alphabet!';
    } else if (this.currentCourse === 'numbers') {
      subtitleText = 'You\'ve learned Morse Code Numbers!';
    } else {
      subtitleText = 'You\'ve completed this Morse Code level!';
    }

    let subtitle = this.game.add.text(
      this.game.world.centerX,
      titleY + verticalSpacing * 0.8,
      subtitleText,
      {
        align: 'center',
      }
    );
    subtitle.fill = '#F1E4D4';
    subtitle.fontSize = statsFontSize;
    subtitle.anchor.setTo(0.5);
    subtitle.font = config.typography.font;
    subtitle.alpha = 0;

    // Animate the subtitle
    this.game.add.tween(subtitle)
      .to({ alpha: 1 }, 800, Phaser.Easing.Cubic.Out, true, 700);

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
      statsY,
      statsText,
      {
        align: 'center',
      }
    );
    stats.fontSize = statsFontSize;
    stats.fill = '#F1E4D4';
    stats.anchor.setTo(0.5);
    stats.font = config.typography.font;
    stats.alpha = 0;

    // Animate the stats text
    this.game.add.tween(stats)
      .to({ alpha: 1 }, 800, Phaser.Easing.Cubic.Out, true, 900)
      .onComplete.add(() => {
        this.game.add.tween(stats)
          .to({ alpha: 0.8 }, 800, 'Linear', true, 0, -1)
          .yoyo(true, 0);
      });

    // Add instruction text
    let nextCourseText = '';
    if (this.currentCourse === 'alphabet') {
      nextCourseText = 'Ready to learn numbers? Click \'Next Level\' below!';
    } else if (this.currentCourse === 'numbers') {
      nextCourseText = 'You\'ve completed all available courses!';
    } else {
      nextCourseText = 'Click below to continue your learning journey!';
    }

    let instruction = this.game.add.text(
      this.game.world.centerX,
      instructionY,
      nextCourseText,
      {
        align: 'center',
      }
    );
    instruction.fontSize = instructionFontSize;
    instruction.fill = '#F1E4D4';
    instruction.anchor.setTo(0.5);
    instruction.font = config.typography.font;
    instruction.alpha = 0;

    // Animate the instruction text
    this.game.add.tween(instruction)
      .to({ alpha: 1 }, 800, Phaser.Easing.Cubic.Out, true, 1100);

    // Add all text elements to the container for easier management
    textContainer.add(title);
    textContainer.add(subtitle);
    textContainer.add(stats);
    textContainer.add(instruction);

    // Store references to text elements for potential later use
    this.congratsTitle = title;
    this.congratsSubtitle = subtitle;
    this.congratsStats = stats;
    this.congratsInstruction = instruction;
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
    const duration = 8 * 1000; // Longer duration
    const end = Date.now() + duration;

    // Initial burst - more particles
    myConfetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#00a651', '#ef4136', '#f1e4d4', '#ffcc00', '#3399ff'], // Custom colors
      shapes: ['square', 'circle'],
      gravity: 0.8, // Slower fall
      scalar: 1.2 // Larger particles
    });

    // Add a second burst after a short delay
    setTimeout(() => {
      myConfetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.5, x: 0.5 },
        colors: ['#00a651', '#ef4136', '#f1e4d4', '#ffcc00', '#3399ff'],
        shapes: ['square', 'circle'],
        gravity: 0.7,
        scalar: 1.1
      });
    }, 700);

    // Continuous confetti with more variety
    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      // Launch confetti from the sides
      myConfetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00a651', '#ef4136', '#f1e4d4', '#ffcc00', '#3399ff'],
        shapes: ['square', 'circle'],
        ticks: 200
      });

      myConfetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00a651', '#ef4136', '#f1e4d4', '#ffcc00', '#3399ff'],
        shapes: ['square', 'circle'],
        ticks: 200
      });

      // Occasionally add confetti from the top
      if (Math.random() > 0.7) {
        myConfetti({
          particleCount: 10,
          angle: 90,
          spread: 45,
          origin: { x: Math.random(), y: 0 },
          colors: ['#00a651', '#ef4136', '#f1e4d4', '#ffcc00', '#3399ff'],
          shapes: ['square', 'circle'],
          ticks: 200
        });
      }
    }, 150);

    // Add a final burst at the end
    setTimeout(() => {
      myConfetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#00a651', '#ef4136', '#f1e4d4', '#ffcc00', '#3399ff'],
        shapes: ['square', 'circle'],
        gravity: 0.6,
        scalar: 1.2
      });
    }, duration - 1000);
  }

  updateConfetti() {
    // Not needed with canvas-confetti library
  }

  createButtons() {
    // Clear any existing buttons first
    this.game.world.children.forEach(child => {
      if (child.inputEnabled && child.events && child.events.onInputDown) {
        child.destroy();
      }
    });

    // Check if there's a next course defined
    const currentCourseConfig = config.courses[this.currentCourse];
    const hasNextCourse = currentCourseConfig && currentCourseConfig.nextCourse;

    // Calculate responsive positions based on screen size
    const isMobile = window.innerWidth < 480;

    // Calculate the available height for content
    const morseboardHeight = document.getElementById('morseboard') ?
      (document.getElementById('morseboard').offsetHeight || 0) : 0;

    // Calculate the usable screen height (excluding morse board if visible)
    const usableHeight = this.game.world.height - morseboardHeight;

    // Calculate vertical spacing and button positions
    const verticalSpacing = isMobile ?
      Math.floor(usableHeight / 10) :
      Math.floor(usableHeight / 8);

    // Position buttons at the bottom of the screen with proper spacing
    // Start from the bottom and work upwards
    const buttonAreaHeight = hasNextCourse ? verticalSpacing * 3 : verticalSpacing * 2;
    const buttonAreaTop = usableHeight - buttonAreaHeight;

    // Calculate button positions
    let nextLevelY = buttonAreaTop + verticalSpacing * 0.8;
    let continueY = hasNextCourse ?
      buttonAreaTop + verticalSpacing * 1.8 :
      buttonAreaTop + verticalSpacing;
    let statsY = hasNextCourse ?
      buttonAreaTop + verticalSpacing * 2.8 :
      buttonAreaTop + verticalSpacing * 2;

    // Variables to store buttons for animation
    let nextLevelButton = null;
    let continueButton = null;
    let statsButton = null;

    // Helper function to create button background
    const createButtonBackground = (x, y, width, height, color, alpha = 0.3) => {
      const bg = this.game.add.graphics(0, 0);
      bg.beginFill(color, alpha);
      bg.drawRoundedRect(x - width/2, y - height/2, width, height, 10);
      bg.endFill();
      return bg;
    };

    if (hasNextCourse) {
      // Next Level button - make it prominent
      // Get the next course name from the config
      const nextCourseName = currentCourseConfig.nextCourse;
      const nextCourseConfig = config.courses[nextCourseName];
      const nextCourseDisplayName = nextCourseConfig ? nextCourseConfig.name : 'Next Level';
      const nextLevelText = `Next Level: ${nextCourseDisplayName} →`;

      // Adjust button size based on screen size
      const nextBtnWidth = isMobile ? 240 : 300;
      const nextBtnHeight = isMobile ? 50 : 60;

      // Create a background for the next level button
      const nextBtnBg = createButtonBackground(
        this.game.world.centerX,
        nextLevelY,
        nextBtnWidth,
        nextBtnHeight,
        0xFFFFFF,
        0.2
      );

      // Add a glow effect to the button
      const glow = this.game.add.graphics(0, 0);
      glow.beginFill(0xFFFFFF, 0.1);
      glow.drawRoundedRect(
        this.game.world.centerX - nextBtnWidth/2 - 5,
        nextLevelY - nextBtnHeight/2 - 5,
        nextBtnWidth + 10,
        nextBtnHeight + 10,
        15
      );
      glow.endFill();

      // Animate the glow
      this.game.add.tween(glow)
        .to({ alpha: 0.3 }, 800, 'Linear', true, 0, -1)
        .yoyo(true, 0);

      // Create the button text
      nextLevelButton = this.game.add.text(
        this.game.world.centerX,
        nextLevelY,
        nextLevelText,
        {
          align: 'center',
        }
      );

      // Adjust font size based on screen size
      nextLevelButton.fontSize = isMobile ?
        Math.min(Math.floor(window.innerWidth / 16), 28) :
        Math.min(Math.floor(window.innerWidth / 14), 32);

      nextLevelButton.fill = '#FFFFFF'; // Brighter white for primary button
      nextLevelButton.anchor.setTo(0.5);
      nextLevelButton.font = config.typography.font;
      nextLevelButton.fontWeight = 'bold';
      nextLevelButton.inputEnabled = true;
      nextLevelButton.events.onInputDown.add(this.goToNextLevel, this);

      // Add a subtle shadow to the text
      nextLevelButton.setShadow(2, 2, 'rgba(0,0,0,0.3)', 2);

      // Make the button interactive with hover effects
      nextLevelButton.input.useHandCursor = true;
      nextLevelButton.events.onInputOver.add(() => {
        nextLevelButton.scale.setTo(1.05);
        nextBtnBg.alpha = 0.3;
      });
      nextLevelButton.events.onInputOut.add(() => {
        nextLevelButton.scale.setTo(1);
        nextBtnBg.alpha = 0.2;
      });

      // Animate the next level button with a pulse effect
      this.game.add.tween(nextLevelButton.scale)
        .to({ x: 1.05, y: 1.05 }, 800, Phaser.Easing.Sinusoidal.InOut, true, 0, -1)
        .yoyo(true, 0);
    }

    // Continue button (only show if there's no next course or as a secondary option)
    const continueText = hasNextCourse ? 'Continue Current Level' : 'Continue Learning';

    // Adjust button size based on screen size
    const continueBtnWidth = isMobile ? 220 : 250;
    const continueBtnHeight = isMobile ? 45 : 50;

    // Create a more subtle background for the continue button
    const continueBtnBg = createButtonBackground(
      this.game.world.centerX,
      continueY,
      continueBtnWidth,
      continueBtnHeight,
      0x000000,
      0.1
    );

    continueButton = this.game.add.text(
      this.game.world.centerX,
      continueY,
      continueText,
      {
        align: 'center',
      }
    );

    // Adjust font size based on screen size
    continueButton.fontSize = isMobile ?
      Math.min(Math.floor(window.innerWidth / 20), 22) :
      Math.min(Math.floor(window.innerWidth / 18), 26);

    continueButton.fill = '#F1E4D4';
    continueButton.alpha = 0.9; // Slightly less prominent
    continueButton.anchor.setTo(0.5);
    continueButton.font = config.typography.font;
    continueButton.inputEnabled = true;
    continueButton.events.onInputDown.add(this.continueLearning, this);

    // Make the button interactive with hover effects
    continueButton.input.useHandCursor = true;
    continueButton.events.onInputOver.add(() => {
      continueButton.scale.setTo(1.05);
      continueBtnBg.alpha = 0.2;
    });
    continueButton.events.onInputOut.add(() => {
      continueButton.scale.setTo(1);
      continueBtnBg.alpha = 0.1;
    });

    // View stats button - make it the least prominent
    const statsText = 'View Statistics';

    // Adjust button size based on screen size
    const statsBtnWidth = isMobile ? 180 : 200;
    const statsBtnHeight = isMobile ? 35 : 40;

    // Create a minimal background for the stats button
    const statsBtnBg = createButtonBackground(
      this.game.world.centerX,
      statsY,
      statsBtnWidth,
      statsBtnHeight,
      0x000000,
      0.05
    );

    statsButton = this.game.add.text(
      this.game.world.centerX,
      statsY,
      statsText,
      {
        align: 'center',
      }
    );

    // Adjust font size based on screen size
    statsButton.fontSize = isMobile ?
      Math.min(Math.floor(window.innerWidth / 24), 18) :
      Math.min(Math.floor(window.innerWidth / 22), 22);

    statsButton.fill = '#F1E4D4';
    statsButton.alpha = 0.8; // Least prominent
    statsButton.anchor.setTo(0.5);
    statsButton.font = config.typography.font;
    statsButton.inputEnabled = true;
    statsButton.events.onInputDown.add(this.showStatistics, this);

    // Make the button interactive with hover effects
    statsButton.input.useHandCursor = true;
    statsButton.events.onInputOver.add(() => {
      statsButton.scale.setTo(1.05);
      statsBtnBg.alpha = 0.1;
    });
    statsButton.events.onInputOut.add(() => {
      statsButton.scale.setTo(1);
      statsBtnBg.alpha = 0.05;
    });

    // Fade in all buttons sequentially
    if (nextLevelButton) {
      this.game.add.tween(nextLevelButton)
        .from({ alpha: 0, y: nextLevelButton.y + 30 }, 500, Phaser.Easing.Cubic.Out, true, 1300);
    }

    this.game.add.tween(continueButton)
      .from({ alpha: 0, y: continueButton.y + 30 }, 500, Phaser.Easing.Cubic.Out, true, 1500);

    this.game.add.tween(statsButton)
      .from({ alpha: 0, y: statsButton.y + 30 }, 500, Phaser.Easing.Cubic.Out, true, 1700);

    // Store references to buttons for potential later use
    this.nextLevelButton = nextLevelButton;
    this.continueButton = continueButton;
    this.statsButton = statsButton;
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
    console.log('goToNextLevel called, current course:', this.currentCourse);

    // Get the next course from the current course config
    const currentCourseConfig = config.courses[this.currentCourse];
    if (currentCourseConfig && currentCourseConfig.nextCourse) {
      const nextCourseName = currentCourseConfig.nextCourse;
      console.log('Next course name:', nextCourseName);

      const nextCourse = config.courses[nextCourseName];
      console.log('Next course config:', nextCourse);

      if (nextCourse) {
        try {
          // Create a new Course instance with the next course config
          const Course = require('./course').Course;
          const newCourse = new Course(nextCourse);
          console.log('Created new course instance:', newCourse);

          // Update the global course and game course
          window.GameApp.course = newCourse;
          this.game.course = newCourse;
          console.log('Updated global course to:', nextCourseName);

          // Reset the letter score dictionary for the new course
          const newLetterScoreDict = {};
          newCourse.lettersToLearn.forEach(letter => {
            newLetterScoreDict[letter] = 0;
          });
          console.log('Created new letter score dictionary for next course');

          // Save the current course progress before switching
          if (typeof Storage !== 'undefined') {
            localStorage.setItem(currentCourseConfig.storageKey, JSON.stringify(this.letterScoreDict));
            console.log('Saved current course progress to localStorage');
          }

          // Update the global config.course value to match the next course
          config.course = nextCourseName;
          console.log('Updated config.course to:', nextCourseName);

          // Start the game with the new course
          console.log('Starting game state with new course...');
          this.game.state.start('game', true, false, newLetterScoreDict);
        } catch (error) {
          console.error('Error transitioning to next course:', error);
        }
      } else {
        console.error('Next course config not found for:', nextCourseName);
      }
    } else {
      console.log('No next course defined for current course:', this.currentCourse);
    }
  }

  showStatistics() {
    // Show statistics overlay
    this.createStatisticsOverlay();
  }

  createStatisticsOverlay() {
    // Create a statistics overlay with improved styling
    const overlay = document.createElement('div');
    overlay.id = 'statistics-overlay';
    overlay.className = 'open';
    overlay.style.backgroundColor = '#00a651'; // Match the congratulations screen color
    overlay.style.zIndex = '2000'; // Ensure it's above the confetti

    // Add a subtle pattern to the background
    overlay.style.backgroundImage = 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)';
    overlay.style.backgroundSize = '20px 20px';

    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    wrapper.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
    wrapper.style.borderRadius = '12px';
    wrapper.style.padding = '30px';
    wrapper.style.boxShadow = '0 5px 30px rgba(0, 0, 0, 0.3)';
    wrapper.style.maxWidth = '600px';
    wrapper.style.margin = '10% auto';
    wrapper.style.color = '#333';

    // Add a header with icon
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'center';
    header.style.marginBottom = '20px';

    // Add a chart icon
    const icon = document.createElement('i');
    icon.className = 'fa fa-chart-bar';
    icon.style.fontSize = '28px';
    icon.style.marginRight = '15px';
    icon.style.color = '#00a651';

    const title = document.createElement('h2');
    title.textContent = 'Your Learning Statistics';
    title.style.fontSize = '28px';
    title.style.margin = '0';
    title.style.color = '#333';

    header.appendChild(icon);
    header.appendChild(title);

    // Create a more stylish close button
    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close statistics');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '15px';
    closeButton.style.right = '15px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#333';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.borderRadius = '50%';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.transition = 'background-color 0.2s';

    closeButton.innerHTML = '<i class="fa fa-times"></i>';
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    });
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.backgroundColor = 'transparent';
    });
    closeButton.addEventListener('click', () => {
      // Add a fade-out animation
      overlay.style.transition = 'opacity 0.3s ease-out';
      overlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 300);
    });

    // Create statistics content
    const statsContent = this.createStatisticsContent();

    wrapper.appendChild(header);
    wrapper.appendChild(statsContent);
    overlay.appendChild(wrapper);
    overlay.appendChild(closeButton);

    // Add with a fade-in animation
    overlay.style.opacity = '0';
    document.body.appendChild(overlay);

    // Trigger reflow
    overlay.offsetWidth;

    // Apply fade-in
    overlay.style.transition = 'opacity 0.3s ease-in';
    overlay.style.opacity = '1';
  }

  createStatisticsContent() {
    const container = document.createElement('div');
    container.style.maxHeight = '60vh';
    container.style.overflowY = 'auto';
    container.style.padding = '0 10px';
    container.style.scrollbarWidth = 'thin';
    container.style.scrollbarColor = '#00a651 #f0f0f0';

    // Get analytics data from localStorage
    let analyticsData = this.analyticsData;
    if (!analyticsData) {
      const storedData = localStorage.getItem('analyticsData');
      analyticsData = storedData ? JSON.parse(storedData) : null;
    }

    if (!analyticsData) {
      const noData = document.createElement('div');
      noData.style.textAlign = 'center';
      noData.style.padding = '30px';
      noData.style.color = '#666';

      const icon = document.createElement('i');
      icon.className = 'fa fa-info-circle';
      icon.style.fontSize = '48px';
      icon.style.color = '#ccc';
      icon.style.display = 'block';
      icon.style.marginBottom = '15px';

      const text = document.createElement('p');
      text.textContent = 'No detailed statistics available.';
      text.style.fontSize = '18px';

      noData.appendChild(icon);
      noData.appendChild(text);
      container.appendChild(noData);
      return container;
    }

    // Create a progress summary section
    const summarySection = document.createElement('div');
    summarySection.style.marginBottom = '30px';
    summarySection.style.textAlign = 'center';

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

    // Create a visual progress indicator
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '100%';
    progressContainer.style.height = '20px';
    progressContainer.style.backgroundColor = '#f0f0f0';
    progressContainer.style.borderRadius = '10px';
    progressContainer.style.overflow = 'hidden';
    progressContainer.style.marginBottom = '15px';
    progressContainer.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.2)';

    const progressBar = document.createElement('div');
    const progressPercent = (learnedLetters / totalLetters) * 100;
    progressBar.style.width = `${progressPercent}%`;
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#00a651';
    progressBar.style.borderRadius = '10px';
    progressBar.style.transition = 'width 1s ease-in-out';

    progressContainer.appendChild(progressBar);
    summarySection.appendChild(progressContainer);

    // Add progress text
    const progressText = document.createElement('p');
    progressText.textContent = `You've mastered ${learnedLetters} out of ${totalLetters} ${itemType} (${Math.round(progressPercent)}%)`;
    progressText.style.fontSize = '18px';
    progressText.style.margin = '10px 0 20px';
    summarySection.appendChild(progressText);

    // Add a subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Here\'s a detailed breakdown of your progress:';
    subtitle.style.fontSize = '16px';
    subtitle.style.color = '#666';
    summarySection.appendChild(subtitle);

    container.appendChild(summarySection);

    // Create a table for letter statistics with improved styling
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'separate';
    table.style.borderSpacing = '0';
    table.style.marginTop = '10px';
    table.style.backgroundColor = '#fff';
    table.style.borderRadius = '8px';
    table.style.overflow = 'hidden';
    table.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f8f8f8';

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
      th.style.padding = '15px 10px';
      th.style.textAlign = 'left';
      th.style.fontWeight = 'bold';
      th.style.color = '#333';
      th.style.borderBottom = '2px solid #eee';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    // Sort letters alphabetically
    const sortedLetters = Object.keys(analyticsData).sort();

    sortedLetters.forEach((letter, index) => {
      const row = document.createElement('tr');

      // Add zebra striping
      if (index % 2 === 1) {
        row.style.backgroundColor = '#f9f9f9';
      }

      // Add hover effect
      row.addEventListener('mouseover', () => {
        row.style.backgroundColor = '#f0f7f0';
      });
      row.addEventListener('mouseout', () => {
        row.style.backgroundColor = index % 2 === 1 ? '#f9f9f9' : '#fff';
      });

      // Letter cell
      const letterCell = document.createElement('td');
      letterCell.textContent = letter.toUpperCase();
      letterCell.style.padding = '12px 10px';
      letterCell.style.fontWeight = 'bold';
      letterCell.style.borderBottom = '1px solid #eee';

      // Add morse code hint
      const morseCode = this.getMorseCode(letter);
      if (morseCode) {
        const morseSpan = document.createElement('span');
        morseSpan.textContent = ` (${morseCode})`;
        morseSpan.style.fontSize = '12px';
        morseSpan.style.color = '#999';
        morseSpan.style.fontWeight = 'normal';
        letterCell.appendChild(morseSpan);
      }

      // Status cell with badge
      const statusCell = document.createElement('td');
      const isLearned = this.letterScoreDict[letter] >= config.app.LEARNED_THRESHOLD;

      const statusBadge = document.createElement('span');
      statusBadge.textContent = isLearned ? 'Learned' : 'Learning';
      statusBadge.style.display = 'inline-block';
      statusBadge.style.padding = '4px 8px';
      statusBadge.style.borderRadius = '12px';
      statusBadge.style.fontSize = '12px';
      statusBadge.style.fontWeight = 'bold';

      if (isLearned) {
        statusBadge.style.backgroundColor = 'rgba(0, 166, 81, 0.1)';
        statusBadge.style.color = '#00a651';
      } else {
        statusBadge.style.backgroundColor = 'rgba(239, 65, 54, 0.1)';
        statusBadge.style.color = '#ef4136';
      }

      statusCell.appendChild(statusBadge);
      statusCell.style.padding = '12px 10px';
      statusCell.style.borderBottom = '1px solid #eee';

      // Correct cell
      const correctCell = document.createElement('td');
      correctCell.textContent = analyticsData[letter].correct;
      correctCell.style.padding = '12px 10px';
      correctCell.style.borderBottom = '1px solid #eee';
      correctCell.style.color = '#00a651';

      // Wrong cell
      const wrongCell = document.createElement('td');
      wrongCell.textContent = analyticsData[letter].wrong;
      wrongCell.style.padding = '12px 10px';
      wrongCell.style.borderBottom = '1px solid #eee';
      wrongCell.style.color = '#ef4136';

      // Accuracy cell with visual indicator
      const accuracyCell = document.createElement('td');
      const total = analyticsData[letter].correct + analyticsData[letter].wrong;
      const accuracy = total > 0 ? Math.round((analyticsData[letter].correct / total) * 100) : 0;

      // Create mini progress bar for accuracy
      const accuracyContainer = document.createElement('div');
      accuracyContainer.style.display = 'flex';
      accuracyContainer.style.alignItems = 'center';

      const accuracyBar = document.createElement('div');
      accuracyBar.style.width = '60px';
      accuracyBar.style.height = '8px';
      accuracyBar.style.backgroundColor = '#eee';
      accuracyBar.style.borderRadius = '4px';
      accuracyBar.style.marginRight = '8px';
      accuracyBar.style.overflow = 'hidden';

      const accuracyFill = document.createElement('div');
      accuracyFill.style.width = `${accuracy}%`;
      accuracyFill.style.height = '100%';
      accuracyFill.style.backgroundColor = this.getAccuracyColor(accuracy);

      accuracyBar.appendChild(accuracyFill);

      const accuracyText = document.createElement('span');
      accuracyText.textContent = `${accuracy}%`;

      accuracyContainer.appendChild(accuracyBar);
      accuracyContainer.appendChild(accuracyText);

      accuracyCell.appendChild(accuracyContainer);
      accuracyCell.style.padding = '12px 10px';
      accuracyCell.style.borderBottom = '1px solid #eee';

      row.appendChild(letterCell);
      row.appendChild(statusCell);
      row.appendChild(correctCell);
      row.appendChild(wrongCell);
      row.appendChild(accuracyCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Add a note at the bottom
    const note = document.createElement('p');
    note.textContent = 'Continue practicing to improve your accuracy and speed!';
    note.style.textAlign = 'center';
    note.style.margin = '20px 0 10px';
    note.style.fontSize = '14px';
    note.style.color = '#666';
    note.style.fontStyle = 'italic';
    container.appendChild(note);

    return container;
  }

  // Helper method to get morse code for a character
  getMorseCode(char) {
    const morseCodeMap = {
      'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.',
      'g': '--.', 'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..',
      'm': '--', 'n': '-.', 'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.',
      's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-',
      'y': '-.--', 'z': '--..',
      '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
      '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
    };
    return morseCodeMap[char.toLowerCase()];
  }

  // Helper method to get color based on accuracy percentage
  getAccuracyColor(accuracy) {
    if (accuracy >= 90) return '#00a651'; // Green for excellent
    if (accuracy >= 70) return '#ffc107'; // Yellow for good
    return '#ef4136'; // Red for needs improvement
  }
}

module.exports.CongratulationsState = CongratulationsState;
