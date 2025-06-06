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

const words = require('./words');
import { getClientHeight, getKeyboardHeight, getGameAreaHeight } from './util'

const isTouch = 'ontouchstart' in document.documentElement;
// Initialize isLandscape, but this will be updated dynamically in App.handleResize()
const isLandscape = window.innerWidth > window.innerHeight;

const breakPointerSwitcher = ({ breakpoint = 500, below, above }) => {
  const width = document.body.clientWidth;
  if(width > breakpoint) return above;
  return below;
}

// Cap the width at double the height
const aspectRatio = 1.45
const maxWidth = getGameAreaHeight() * aspectRatio
const appWidth = Math.min(document.body.clientWidth, maxWidth, 800)

const centreOffset = breakPointerSwitcher({ above: 0.5, below: 0.35 });

const mainFontSize = 70
const titleOffset = 60
const startButtonOffset = 190
const startButtonSize = 37

// Adjust letter size based on screen width
const letterSize = Math.min(window.innerWidth / 20, 38);
// Smaller font on very small screens
const smallScreenLetterSize = window.innerWidth < 375 ? Math.min(window.innerWidth / 24, 30) : letterSize;

const wordBrickSize = breakPointerSwitcher({ above: 200, below: 100 });
const wordLetterSize = breakPointerSwitcher({ above: 150, below: 50 });

const config = {
  GLOBALS: {
    isTouch: isTouch,
    isLandscape: isLandscape,
    appWidth,
    appHeight: getClientHeight(),
    devicePixelRatio: window.devicePixelRatio,
    worldBottom: (!isLandscape ? getClientHeight() : appWidth) - getKeyboardHeight(),
    worldCenter: ((!isLandscape ? getClientHeight() : appWidth) - getKeyboardHeight()) * centreOffset,
    worldTop: ((!isLandscape ? getClientHeight() : appWidth) - getKeyboardHeight()) * 0.35
  },
  app: {
    LEARNED_THRESHOLD: 2,
    CONSECUTIVE_CORRECT: 3,
    howManyWordsToStart: 2,
    wordBrickSize,
    wordLetterSize,
    spaceBetweenWords: 300,
    backgroundColor: '#ef4136',
    smoothed: true,
  },
  typography: {
    font: 'Poppins, Helvetica, Arial, sans-serif',
  },
  header: {
    letterSize: window.innerWidth < 375 ? smallScreenLetterSize : letterSize,
    topPosition: 30,
    letterSpacing: window.innerWidth < 375 ? 2 : 5,
  },
  title: {
    mainFontSize,
    startButtonSize,
    titleOffset,
    startButtonOffset
  },
  hints: {
    hintOffset: 120,
    hintSize: 0.50,
    hintTextSize: 39,
  },
  animations: {
    SLIDE_START_DELAY: 400,
    SLIDE_END_DELAY: 600,
    SLIDE_TRANSITION: 600,
  },
  courses: {
    alphabet: {
      name: 'Alphabet',
      headerSpacing: -10,
      storageKey: 'savedLetters',
      letters: ['e', 't', 'a', 'i', 'm', 's', 'o', 'h', 'n', 'c', 'r', 'd', 'u', 'k', 'l', 'f', 'b', 'p', 'g', 'j', 'v', 'q', 'w', 'x', 'y', 'z'],
      words: words,
      nextCourse: 'numbers'
    },
    numbers: {
      name: 'Numbers',
      headerSpacing: -10,
      storageKey: 'savedNumbers',
      letters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      words: ['123', '456', '789', '012', '345', '678', '901', '234', '567', '890', '1234', '5678', '9012', '3456', '7890']
    },
    keyboard: {
      name: 'Keyboard Keys',
      headerSpacing: 5,
      storageKey: 'savedKeyboardLetters',
      letters: {'⎋':'esc','⌦':'del','↦':'tab'},
      words: ['⎋⎋↦', '⎋↦⎋', '⌦⌦⌦'],
      assets: 'keyboard'
    }
  },
  course: 'alphabet'
};

module.exports = config;
