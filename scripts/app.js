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
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import Phaser from './phaser-global';
import { TitleState } from './title-state';
import { IntroState } from './intro-state';
import { GameState } from './game-state';
import { CongratulationsState } from './congratulations-state';
import * as config from './config';
import { getClientHeight, getKeyboardHeight } from './util';
import { Course } from './course';
import { SoundManager } from './sound-manager';
import assetPathsModule from './asset-paths';

class App {

  constructor() {
    console.log('App constructor called');

    try {
      this.game = null;
      this.downEvent = null;
      this.modalShow = false;

      // Make assetPaths available to the whole class
      this.assetPaths = assetPathsModule;

      // Initialize course with error handling
      try {
        if (config.courses && config.course && config.courses[config.course]) {
          console.log('Creating course from config:', config.course);
          this.course = new Course(config.courses[config.course]);
        } else {
          console.error('Course config not found, creating default course');
          this.course = {
            lettersToLearn: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
            headerSpacing: 5,
            storageKey: 'morse-learn-progress'
          };
        }
      } catch (error) {
        console.error('Error creating course:', error);
        this.course = {
          lettersToLearn: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
          headerSpacing: 5,
          storageKey: 'morse-learn-progress'
        };
      }

      // Make assetPaths available globally
      window.GameApp = window.GameApp || {};
      window.GameApp.assetPaths = assetPathsModule;

      // Add global function to toggle one-switch mode
      window.GameApp.toggleOneSwitchMode = (enable) => {
        // Store the setting in localStorage
        if (typeof Storage !== "undefined") {
          localStorage.setItem("one_switch_mode", enable);
        }

        // Update the game state if it exists
        if (this.game && this.game.state) {
          // Store in game object for access across states
          this.game.oneSwitchMode = enable;

          // If we're in the game state, update the morseBoard
          if (this.game.state.current === 'game') {
            const gameState = this.game.state.states.game;
            if (gameState && gameState.gameSpace && gameState.gameSpace.morseBoard) {
              gameState.gameSpace.morseBoard.toggleOneSwitchMode(enable);
              return true;
            }
          }
        }

        return false;
      };

      // Handle clicking of modal
      try {
        const button = document.getElementById('button');
        if (button) {
          button.addEventListener('click', () => {
            this.modalShow = this.modalShow ? false : true;
            this.showModal();
          }, false);
        } else {
          console.error('Button element not found');
        }

        // Deeplinking to /#about
        if (window.location.hash === '#about') {
          this.modalShow = true;
          this.showModal();
        }
      } catch (error) {
        console.error('Error setting up modal handlers:', error);
      }
    } catch (error) {
      console.error('Error in app constructor:', error);
    }
  }

  startGameApp() {
    console.log('Starting game app');

    try {
      this.game = new Phaser.Game('100%', config.GLOBALS.appHeight, Phaser.CANVAS, '', {
        resolution: config.GLOBALS.devicePixelRatio,
        preload: this.preload,
        create: this.create
      });
      console.log('Game created successfully');
    } catch (error) {
      console.error('Error starting game app:', error);
    }
  }

  // Determines starting device orientation
  // TODO Figure out why this needs to return a promise even though there is no async code
  determineOrientation() {
    let bodyHeight = getClientHeight();

    return new Promise((resolve) => {
      if (config.GLOBALS.isLandscape && screen.width <= 768) {
        if (screen.width < 768) {
          bodyHeight = document.body.clientWidth * 1.5;
        } else if (config.GLOBALS.devicePixelRatio > 3) {
          bodyHeight = document.body.clientWidth * 2;
        } else {
          bodyHeight = document.body.clientWidth;
        }
      }

      config.GLOBALS.appHeight = bodyHeight;
      resolve();
    });
  }

  // Resize scaling, based on device, support both orientations
  determineScale() {
    this.game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;

    // Add window resize event handler
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Initial resize
    this.handleResize();

    // For desktop, use SHOW_ALL scale mode
    if (this.game.device.desktop) {
      this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    }

    // Make sure the landscape message is hidden
    document.getElementById('landscape').style.display = 'none';

    // Always show the game content
    this.game.world.alpha = 1;
  }

  // Handle window resize
  handleResize() {
    if (!this.game) return;

    // Update the game height based on the current window size
    const newHeight = getClientHeight();
    config.GLOBALS.appHeight = newHeight;

    // Update isLandscape flag based on current orientation
    config.GLOBALS.isLandscape = window.innerWidth > window.innerHeight;

    // Update world positions
    const keyboardHeight = getKeyboardHeight();
    const centreOffset = window.innerWidth > 500 ? 0.5 : 0.35;

    config.GLOBALS.worldBottom = (newHeight - keyboardHeight);
    config.GLOBALS.worldCenter = (newHeight - keyboardHeight) * centreOffset;
    config.GLOBALS.worldTop = (newHeight - keyboardHeight) * 0.35;

    // Resize the game canvas
    this.game.scale.setGameSize(this.game.width, newHeight);

    // If we're in the game state, update the header position
    if (this.game.state.current === 'game' && this.game.state.states.game.header) {
      const header = this.game.state.states.game.header;
      header.updatePosition();
    }

    // Adjust UI elements based on orientation if needed
    this.adjustUIForOrientation();
  }

  // Adjust UI elements based on current orientation
  adjustUIForOrientation() {
    // Get current orientation
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth < 480;

    // Adjust UI elements as needed for different orientations
    const morseBoard = document.getElementById('morseboard');
    if (morseBoard) {
      // In landscape mode on small screens, we might want to adjust the morse board height
      if (isLandscape && window.innerWidth < 768) {
        morseBoard.style.maxHeight = '180px';
      } else if (isMobile) {
        morseBoard.style.maxHeight = '160px';
      } else {
        morseBoard.style.maxHeight = '220px';
      }
    }

    // Update header position if the game is initialized
    if (this.game && this.game.state && this.game.state.current === 'game' && this.game.state.states.game && this.game.state.states.game.header) {
      this.game.state.states.game.header.updatePosition();
    }
  }

  create() {
    console.log('App create method called');

    try {
      GameApp.enableLoadingModal(false);

      this.game.stage.backgroundColor = config.app.backgroundColor;
      this.game.stage.smoothed = config.app.smoothed;
      GameApp.determineScale();

      // Show about and settings buttons
      document.getElementById('button').style.display = 'block';
      document.getElementById('settings-button').style.display = 'block';



      const getCodeButton = document.getElementById('get-code-button');
      if (getCodeButton) {
        getCodeButton.addEventListener('click', () => {
          if (this.game.state.current === 'game') {
            const gameState = this.game.state.states.game;
            if (gameState) {
              const code = gameState.generateCode();
              prompt("Here is your code:", code);
            }
          }
        });
      }

      const loadCodeButton = document.getElementById('load-code-button');
      if (loadCodeButton && !loadCodeButton.hasAttribute('data-listener-added')) {
        loadCodeButton.setAttribute('data-listener-added', 'true');
        loadCodeButton.addEventListener('click', () => {
          if (this.game.state.current === 'game') {
            const modal = document.getElementById('load-from-code-modal');
            modal.style.display = 'block';

            const closeButton = modal.querySelector('.close-button');
            if (closeButton && !closeButton.hasAttribute('data-listener-added')) {
              closeButton.setAttribute('data-listener-added', 'true');
              closeButton.addEventListener('click', () => {
                modal.style.display = 'none';
              });
            }

            const loadButton = modal.querySelector('#load-button');
            if (loadButton && !loadButton.hasAttribute('data-listener-added')) {
              loadButton.setAttribute('data-listener-added', 'true');
              loadButton.addEventListener('click', () => {
                const code = document.getElementById('code-input').value;
                if (code) {
                  const gameState = this.game.state.states.game;
                  if (gameState) {
                    gameState.loadFromCode(code);
                    modal.style.display = 'none';
                    // Close settings modal too
                    const settingsModal = document.getElementById('settings-modal');
                    if (settingsModal) {
                      settingsModal.classList.remove('open');
                    }
                  }
                }
              });
            }
          }
        });
      }

      // Make sure the course is properly initialized
      if (!GameApp.course) {
        console.log('Creating default course in app.js');
        GameApp.course = {
          lettersToLearn: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'],
          headerSpacing: 5,
          storageKey: 'morse-learn-progress'
        };
      }

      // Make sure the course is accessible to the game
      this.game.course = GameApp.course;
      console.log('Course initialized in app.js:', this.game.course);

      // Add game states
      console.log('Adding game states');
      this.game.state.add('title', new TitleState(this.game, GameApp.course));
      this.game.state.add('intro', new IntroState(this.game));
      this.game.state.add('game', new GameState(this.game, GameApp.course));
      this.game.state.add('congratulations', new CongratulationsState(this.game, GameApp.course));

      // Start with the title state
      console.log('Starting title state');
      this.game.state.start('title');
    } catch (error) {
      console.error('Error in app create method:', error);
    }
  }

  preload() {
    console.log('App preload method called');

    try {
      GameApp.enableLoadingModal();

      // Images - using asset paths from asset-paths.js
      console.log('Loading letter images');

      // Check if assetPaths is available
      if (!GameApp.assetPaths) {
        console.error('Asset paths not available');
        return;
      }

      // Load letter images
      const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

      for (const letter of letters) {
        if (GameApp.assetPaths[letter]) {
          this.game.load.image(letter, GameApp.assetPaths[letter]);
        } else {
          console.warn(`Asset path for letter ${letter} not found`);
        }
      }

      // Load UI images
      console.log('Loading UI images');
      if (GameApp.assetPaths.close) {
        this.game.load.image('close', GameApp.assetPaths.close);
      }
      if (GameApp.assetPaths.badge) {
        this.game.load.image('badge', GameApp.assetPaths.badge);
      }

      // Video
      console.log('Loading intro video');
      if (GameApp.assetPaths.intro) {
        this.game.load.video('intro', GameApp.assetPaths.intro);
      } else {
        console.warn('Intro video asset path not found');
      }

      // Audio
      console.log('Initializing sound manager');
      try {
        this.game.customSoundManager = new SoundManager();

        // Use assetPaths for loading sounds
        const sounds = {
          'period': GameApp.assetPaths.periodSound,
          'dash': GameApp.assetPaths.dashSound,
          'dot': GameApp.assetPaths.dotSound,
          'correct': GameApp.assetPaths.correctSound,
          'wrong': GameApp.assetPaths.wrongSound
        };

        for (const [name, path] of Object.entries(sounds)) {
          if (path) {
            this.game.customSoundManager.createSound(name, path);
          } else {
            console.warn(`Sound asset path for ${name} not found`);
          }
        }

        console.log('Sound manager initialized with basic sounds');
      } catch (error) {
        console.error('Error initializing sound manager:', error);
      }


      // letters + soundalike list
      // First load the nohint image with a special key - MUST be loaded first
      console.log('Loading nohint image');
      if (GameApp.assetPaths.nohint) {
        this.game.load.image('nohint', GameApp.assetPaths.nohint);
      } else {
        console.warn('Nohint image asset path not found');
      }

      // Make sure the nohint image is loaded before proceeding
      this.game.load.onFileComplete.add((progress, cacheKey) => {
        if (cacheKey === 'nohint') {
          console.log('nohint image loaded successfully');
        }
      });

      // Then load the letter sounds
      console.log('Loading letter sounds');
      try {
        // Check if course and letters are available
        if (GameApp.course && GameApp.course.letters) {
          for (let letter of GameApp.course.letters) {
            // Load the sounds for each letter
            const letterSoundPathKey = 'letter_' + letter + '_sound';
            const soundalikeMwPathKey = 'soundalike_mw_' + letter + '_sound';

            if (GameApp.assetPaths[letterSoundPathKey]) {
              this.game.customSoundManager.createSound('letter-' + letter, GameApp.assetPaths[letterSoundPathKey]);
            } else {
              console.warn(`Asset path for letter sound ${letterSoundPathKey} not found.`);
            }

            if (GameApp.assetPaths[soundalikeMwPathKey]) {
              this.game.customSoundManager.createSound('soundalike-letter-' + letter, GameApp.assetPaths[soundalikeMwPathKey]);
            } else {
              console.warn(`Asset path for soundalike_mw ${soundalikeMwPathKey} not found.`);
            }
          }
        } else {
          console.warn('Course or letters not available for loading letter sounds');
        }
      } catch (error) {
        console.error('Error loading letter sounds:', error);
      }

      // Make sure the images are properly loaded before starting the game
      this.game.load.onLoadComplete.add(() => {
        console.log("All assets loaded successfully");
      });

      console.log('All sound files loaded');
    } catch (error) {
      console.error('Error in preload method:', error);
    }
  }

  // Show about modal
  showModal() {
    console.log('Show modal called, modalShow:', this.modalShow);

    try {
      if (this.modalShow) {
        window.location.hash = '#about';

        const button = document.getElementById('button');
        if (button) {
          button.innerHTML = `<img src="${this.assetPaths.close}">`;
        } else {
          console.error('Button element not found');
        }

        const overlay = document.getElementById('overlay');
        if (overlay) {
          overlay.classList.add('open');
        } else {
          console.error('Overlay element not found');
        }
      } else {
        window.location.hash = '';

        const button = document.getElementById('button');
        if (button) {
          button.innerHTML = '?';
        } else {
          console.error('Button element not found');
        }

        const overlay = document.getElementById('overlay');
        if (overlay) {
          overlay.classList.remove('open');
        } else {
          console.error('Overlay element not found');
        }
      }
    } catch (error) {
      console.error('Error in showModal method:', error);
    }
  }

  // show loading modal
  enableLoadingModal(show = true) {
    console.log('Enable loading modal called, show:', show);

    try {
      const modalId = 'loading-overlay';
      const modal = document.getElementById(modalId);

      if (modal) {
        if (show) {
          modal.classList.add('open');
        } else {
          modal.classList.remove('open');
        }
      } else {
        console.error('Loading modal element not found');
      }
    } catch (error) {
      console.error('Error in enableLoadingModal method:', error);
    }
  }
}

// Start App
const GameApp = new App();
GameApp.determineOrientation().then(() => {
  GameApp.startGameApp();
});
