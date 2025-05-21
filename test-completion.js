// This script simulates a user completing all letters to test the congratulations screen
// Run this in the browser console to test

// Set all letters as learned
function completeAllLetters() {
  // Get the current course
  const course = window.GameApp.course;
  
  // Create a dictionary with all letters marked as learned
  const learnedLetters = {};
  course.lettersToLearn.forEach(letter => {
    learnedLetters[letter] = 3; // Set to learned threshold + 1
  });
  
  // Save to localStorage
  localStorage.setItem(course.storageKey, JSON.stringify(learnedLetters));
  
  // Create analytics data
  const analyticsData = {};
  course.lettersToLearn.forEach(letter => {
    analyticsData[letter] = {
      correct: 10,
      wrong: 2
    };
  });
  
  // Save analytics data
  localStorage.setItem('analyticsData', JSON.stringify(analyticsData));
  
  console.log('All letters marked as learned. Reload the page and start the game to see the congratulations screen.');
}

// Call the function
completeAllLetters();
