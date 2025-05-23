/**
 * From game to congratulations screen
 * 
 * This script is designed to be used when you're already in the game state.
 * It will directly transition to the congratulations screen.
 * 
 * To use:
 * 1. Start the app with npm start
 * 2. Click "Tap here to start" to initialize the game
 * 3. Wait for the game to fully load (you should see the letter display)
 * 4. Open the browser console (F12 or right-click > Inspect > Console)
 * 5. Copy and paste this entire script into the console
 * 6. Press Enter to run it
 */

(function() {
  console.log('Transitioning from game to congratulations screen...');
  
  // Create a dictionary with all letters marked as learned
  const learnedLetters = {};
  const alphabet = ['e', 't', 'a', 'i', 'm', 's', 'o', 'h', 'n', 'c', 'r', 'd', 'u', 'k', 'l', 'f', 'b', 'p', 'g', 'j', 'v', 'q', 'w', 'x', 'y', 'z'];
  
  alphabet.forEach(letter => {
    learnedLetters[letter] = 3; // Set to learned threshold + 1
  });
  
  // Create simple analytics data
  const analyticsData = {};
  alphabet.forEach(letter => {
    analyticsData[letter] = {
      correct: 10,
      wrong: 2
    };
  });
  
  // Try to find the game object
  let game = null;
  
  // First check if it's available in the GameApp global
  if (window.GameApp && window.GameApp.game) {
    game = window.GameApp.game;
    console.log('Found game in window.GameApp.game');
  }
  
  // If not, check if it's available in the Phaser.GAMES array
  if (!game && window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES.length > 0) {
    game = window.Phaser.GAMES[0];
    console.log('Found game in Phaser.GAMES[0]');
  }
  
  // If still not found, look for it in the window object
  if (!game) {
    for (let prop in window) {
      if (typeof window[prop] === 'object' && window[prop] !== null) {
        if (window[prop].isBooted && typeof window[prop].state === 'object') {
          game = window[prop];
          console.log('Found game in window.' + prop);
          break;
        }
      }
    }
  }
  
  // If we found the game, try to transition to the congratulations state
  if (game) {
    console.log('Game found, current state:', game.state.current);
    
    try {
      // Check if we're in the game state
      if (game.state.current === 'game') {
        console.log('Currently in game state, transitioning to congratulations state...');
        
        // Get the current letter score dictionary from the game state if available
        let currentLetterScoreDict = learnedLetters;
        if (game.state.states.game && game.state.states.game.letterScoreDict) {
          currentLetterScoreDict = game.state.states.game.letterScoreDict;
          console.log('Using current letter score dictionary from game state');
        }
        
        // Get the current analytics data if available
        let currentAnalyticsData = analyticsData;
        if (game.state.states.game && game.state.states.game.analyticsData) {
          currentAnalyticsData = game.state.states.game.analyticsData;
          console.log('Using current analytics data from game state');
        }
        
        // Get the current course if available
        let currentCourse = 'alphabet';
        if (game.state.states.game && game.state.states.game.currentCourse) {
          currentCourse = game.state.states.game.currentCourse;
          console.log('Using current course from game state:', currentCourse);
        }
        
        // Start the congratulations state
        game.state.start('congratulations', true, false, {
          letterScoreDict: currentLetterScoreDict,
          analyticsData: currentAnalyticsData,
          currentCourse: currentCourse
        });
        
        console.log('Congratulations state started!');
      } else {
        console.log('Not in game state, transitioning to congratulations state directly...');
        
        // Start the congratulations state
        game.state.start('congratulations', true, false, {
          letterScoreDict: learnedLetters,
          analyticsData: analyticsData,
          currentCourse: 'alphabet'
        });
        
        console.log('Congratulations state started!');
      }
    } catch (error) {
      console.error('Error transitioning to congratulations state:', error);
    }
  } else {
    console.error('Game not found. Make sure you are on the game screen and have clicked "Tap here to start".');
  }
})();
