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

import { HeaderSpace } from './header-space';
import { GameSpace } from './game-space';
import { englishToMorse, morseToEnglish } from './morse-dictionary';

class GameState {

  constructor(game, course) {
   	this.course = course;
    this.letterScoreDict = {};
    this.morseDictionary = englishToMorse;
    this.morseToEnglish = morseToEnglish
    this.header = null;
    this.gameSpace = null;
    this.game = game;
  }

  init(params) {
    console.log('Game state init method called with params:', params);
    this.letterScoreDict = params || {};

    // Initialize course if not already initialized
    if (!this.game.course) {
      console.log('Initializing course in game state');
      this.game.course = {
        lettersToLearn: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
      };
    }

    // Make sure the course is accessible to this state
    this.course = this.game.course;
    console.log('Course initialized:', this.course);
  }

  create() {
    console.log('Game state create method called');

    try {
      // Create game space
      this.gameSpace = new GameSpace(this.game);
      this.gameSpace.parent = this;
      this.gameSpace.create();
      console.log('Game space created successfully');

      // Keep gamespace under header space
      this.game.world.sendToBack(this.gameSpace.gameSpaceGroup);

      // Create header space
      this.header = new HeaderSpace(this.game);
      this.header.parent = this;
      this.header.create();
      console.log('Header space created successfully');

      // Keep header space on top
      this.game.world.bringToTop(this.header.headerGroup);

      // Make sure the morse board is visible when the game state is created
      // Check if it should be hidden based on user preference
      const morseBoardHidden = localStorage.getItem('morseboard_hidden') === 'true';
      console.log('Morse board hidden preference:', morseBoardHidden);

      // Show morse board with a slight delay to ensure game state is fully initialized
      setTimeout(() => {
        if (!morseBoardHidden) {
          const morseBoard = document.getElementById('morseboard');
          if (morseBoard) {
            morseBoard.style.display = 'flex';
            morseBoard.classList.remove('hidden');
            console.log('Showing morse board in game state');
          } else {
            console.error('Morse board element not found');
          }
        }
      }, 500);
    } catch (error) {
      console.error('Error in game state create method:', error);
    }
  }

  // Save progress to localStorage
  saveProgress() {
    if (typeof(Storage) !== 'undefined') {
      localStorage.setItem(this.course.storageKey, JSON.stringify(this.letterScoreDict));
    }
  }
}

module.exports.GameState = GameState;
