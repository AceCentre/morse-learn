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
import { getClientHeight } from './util';
import { Course } from './course';
import { SoundManager } from './sound-manager';
import assetPathsModule from './asset-paths';

class App {

  constructor() {
    this.game = null;
    this.downEvent = null;
    this.modalShow = false;

    // Make assetPaths available to the whole class
    this.assetPaths = assetPathsModule;

    this.course = new Course(config.courses[config.course]);

    // Make assetPaths available globally
    window.GameApp = window.GameApp || {};
    window.GameApp.assetPaths = assetPathsModule;

    // Handle clicking of modal
    document.getElementById('button').addEventListener('click', () => {
      this.modalShow = this.modalShow ? false : true;
      this.showModal();
    }, false);

    // Deeplinking to /#about
    if (window.location.hash === '#about') {
      this.modalShow = true;
      this.showModal();
    }
  }

  startGameApp() {
    this.game = new Phaser.Game('100%', config.GLOBALS.appHeight, Phaser.CANVAS, '', {
      resolution: config.GLOBALS.devicePixelRatio,
      preload: this.preload,
      create: this.create
    });
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

  // Resize scaling, based on device, force orientation
  determineScale() {
    this.game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;

    // Only if mobile
    if (!this.game.device.desktop) {
      this.game.scale.forceOrientation(false, true);

      // Landscape orientation
      this.game.scale.enterIncorrectOrientation.add(() => {
        this.game.world.alpha = 0;
        document.getElementById('landscape').style.display = 'block';

        if (this.game.state.current === 'title') {
          document.getElementById('button').style.display = 'none';
          document.getElementById('overlay').style.display = 'none';
        }
      });

      // Portrait orientation
      this.game.scale.leaveIncorrectOrientation.add(() => {
        this.game.world.alpha = 1;
        document.getElementById('landscape').style.display = 'none';

        if (this.game.state.current === 'title') {
          // document.getElementById('button').style.display = 'block';
          document.getElementById('overlay').style.display = 'block';
        }
      });
    } else {
      this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    }
  }

  create() {
    GameApp.enableLoadingModal(false)

    this.game.stage.backgroundColor = config.app.backgroundColor;
    this.game.stage.smoothed = config.app.smoothed;
    GameApp.determineScale();

    // Show about button
    document.getElementById('button').style.display = 'block';

    this.game.state.add('title', new TitleState(this.game, GameApp.course));
    this.game.state.add('intro', new IntroState(this.game));
    this.game.state.add('game', new GameState(this.game, GameApp.course));
    this.game.state.add('congratulations', new CongratulationsState(this.game, GameApp.course));
    this.game.state.start('title');
  }

  preload() {
    GameApp.enableLoadingModal()

    // Images - using asset paths from asset-paths.js
    this.game.load.image('a', GameApp.assetPaths.a);
    this.game.load.image('b', GameApp.assetPaths.b);
    this.game.load.image('c', GameApp.assetPaths.c);
    this.game.load.image('d', GameApp.assetPaths.d);
    this.game.load.image('e', GameApp.assetPaths.e);
    this.game.load.image('f', GameApp.assetPaths.f);
    this.game.load.image('g', GameApp.assetPaths.g);
    this.game.load.image('h', GameApp.assetPaths.h);
    this.game.load.image('i', GameApp.assetPaths.i);
    this.game.load.image('j', GameApp.assetPaths.j);
    this.game.load.image('k', GameApp.assetPaths.k);
    this.game.load.image('l', GameApp.assetPaths.l);
    this.game.load.image('m', GameApp.assetPaths.m);
    this.game.load.image('n', GameApp.assetPaths.n);
    this.game.load.image('o', GameApp.assetPaths.o);
    this.game.load.image('p', GameApp.assetPaths.p);
    this.game.load.image('q', GameApp.assetPaths.q);
    this.game.load.image('r', GameApp.assetPaths.r);
    this.game.load.image('s', GameApp.assetPaths.s);
    this.game.load.image('t', GameApp.assetPaths.t);
    this.game.load.image('u', GameApp.assetPaths.u);
    this.game.load.image('v', GameApp.assetPaths.v);
    this.game.load.image('w', GameApp.assetPaths.w);
    this.game.load.image('x', GameApp.assetPaths.x);
    this.game.load.image('y', GameApp.assetPaths.y);
    this.game.load.image('z', GameApp.assetPaths.z);

    this.game.load.image('close', GameApp.assetPaths.close);
    this.game.load.image('badge', GameApp.assetPaths.badge);

    // Video
    this.game.load.video('intro', GameApp.assetPaths.intro);

    // Audio
    this.game.customSoundManager = new SoundManager()
    this.game.customSoundManager.createSound('period', '/assets/sounds/period')
    this.game.customSoundManager.createSound('dash', '/assets/sounds/dash')
    this.game.customSoundManager.createSound('dot', '/assets/sounds/dot')


    // letters + soundalike list
    let path = '/assets' + GameApp.course.assets;

    // First load the nohint image with a special key
    this.game.load.image('nohint', GameApp.assetPaths.nohint);

    // Then create a texture for each letter that points to the same image
    for (let letter of GameApp.course.letters) {
      // Create a reference to the nohint image for each letter
      this.game.load.image(letter, GameApp.assetPaths.nohint);
      this.game.customSoundManager.createSound('letter-' + letter, path + 'sounds/' + letter)
      this.game.customSoundManager.createSound('soundalike-letter-' + letter, path + 'sounds/soundalikes-mw/' + letter)
    }

    // Make sure the images are properly loaded before starting the game
    this.game.load.onLoadComplete.add(() => {
      console.log("All assets loaded successfully");
    });
    // correct, wrong
    this.game.customSoundManager.createSound('correct', '/assets/sounds/correct');
    this.game.customSoundManager.createSound('wrong', '/assets/sounds/wrong');
  }

  // Show about modal
  showModal() {
    if (this.modalShow) {
      window.location.hash = '#about';
      document.getElementById('button').innerHTML = `<img src="${this.assetPaths.close}">`;
      document.getElementById('overlay').classList.add('open');
    } else {
      window.location.hash = '';
      document.getElementById('button').innerHTML = '?';
      document.getElementById('overlay').classList.remove('open');
    }
  }

  // show loading modal
  enableLoadingModal(show = true) {
    const modalId = 'loading-overlay'
    if (show) {
      document.getElementById(modalId).classList.add('open')
    } else {
      document.getElementById(modalId).classList.remove('open')
    }
  }
}

// Start App
const GameApp = new App();
GameApp.determineOrientation().then(() => {
  GameApp.startGameApp();
});
