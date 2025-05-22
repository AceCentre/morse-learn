import { morseToEnglish } from "./morse-dictionary";

class MorseBoard {
  constructor(options) {
    this.timeout = null;
    this.morseDictionary = morseToEnglish;

    // Check for saved one-switch mode preference
    if (typeof Storage !== "undefined" && options.loadPreferences !== false) {
      const savedOneSwitchMode = localStorage.getItem("one_switch_mode");
      if (savedOneSwitchMode !== null) {
        options.oneSwitchMode = savedOneSwitchMode === "true";
      }
    }

    this.config = this.mergeSettings(options);
    this.game = options.game;
    this.create();
  }

  mergeSettings(options) {
    var settings = {
      autoCommit: true,
      debounce: 1e3,
      dashKeyMap: [
        189, // -
        173, // -
        75, // k
        13, // enter
      ],
      dashSoundPath: "../assets/sounds/dash.mp3",
      dotKeyMap: [
        190, // .
        74, // j
      ],
      dotSoundPath: "../assets/sounds/dot.mp3",
      height: "25vh",
      notification: true,
      notificationDuration: 1e3,
      notificationStyle: "overlay",
      output: true,
      sounds: true,
      onCommit: function onCommit() {},
      // One-switch mode settings
      oneSwitchMode: false,
      oneSwitchKeyMap: [88], // x key
      oneSwitchTimeout: 500, // ms to differentiate between dot and dash
    };
    var userSttings = options;
    for (var attrname in userSttings) {
      settings[attrname] = userSttings[attrname];
    }
    return settings;
  }

  create() {
    this.background = document.getElementById("morseboard");
    if (!this.background) {
      console.error("Morse board element not found");
      return;
    }

    // Don't force display:flex here - let the game state handle this
    // This prevents the morse board from blocking clicks on the title screen
    this.background.style.height = this.config.height;

    this.output = document.getElementById("output");
    if (!this.output) {
      console.error("Morse board output element not found");
      return;
    }

    this.output.style.bottom = this.config.height;
    this.output.style.visibility = this.config.output ? "visible" : "hidden";
    this.output.style.pointerEvents = this.config.output ? "auto" : "none";
    this.output.setAttribute("readonly", "true");
    this.output.setAttribute("tabindex", "-1");

    this.buttonBox = document.getElementById("button-box");
    if (!this.buttonBox) {
      console.error("Morse board button box not found");
      return;
    }

    this.dotButton = document.getElementById("dot");
    if (!this.dotButton) {
      console.error("Morse board dot button not found");
      return;
    }
    this.dotButton.setAttribute("tabindex", "0");

    this.dashButton = document.getElementById("dash");
    if (!this.dashButton) {
      console.error("Morse board dash button not found");
      return;
    }
    this.dashButton.setAttribute("tabindex", "0");

    // Initialize one-switch mode variables
    this.switchPressStartTime = 0;
    this.oneSwitchKeyPressed = false;
    this.progressIndicator = document.getElementById("one-switch-progress");
    this.progressAnimationFrame = null;

    if (this.config.sounds && !this.detectIE()) {
      this.dotAudio = document.createElement("audio");
      var dotSource = document.createElement("source");
      dotSource.setAttribute("src", this.config.dotSoundPath);
      dotSource.setAttribute("type", "audio/mp3");
      this.dotAudio.id = "dotSound";
      this.dotAudio.style.position = "absolute";
      this.dotAudio.style.visibility = "hidden";
      this.dotAudio.appendChild(dotSource);
      document.body.appendChild(this.dotAudio);
      this.dashAudio = document.createElement("audio");
      var dashSource = document.createElement("source");
      dashSource.setAttribute("src", this.config.dashSoundPath);
      dashSource.setAttribute("type", "audio/mp3");
      this.dashAudio.id = "dashSound";
      this.dashAudio.style.position = "absolute";
      this.dashAudio.style.visibility = "hidden";
      this.dashAudio.appendChild(dashSource);
      document.body.appendChild(this.dashAudio);
    }

    // Bind event handlers to preserve 'this' context
    this.boundOnKeydown = this.onKeydown.bind(this);
    this.boundOnKeyup = this.onKeyup.bind(this);
    this.boundOnClick = this.onClick.bind(this);
    this.boundCommit = this.commit.bind(this);

    window.addEventListener("keydown", this.boundOnKeydown, false);

    // Add keyup event listener for one-switch mode
    if (this.config.oneSwitchMode) {
      window.addEventListener("keyup", this.boundOnKeyup, false);
    }

    this.dotButton.addEventListener("click", this.boundOnClick, false);
    this.dashButton.addEventListener("click", this.boundOnClick, false);

    this.output.addEventListener("commit", this.boundCommit, false);

    // Update keyboard hint based on mode
    this.updateKeyboardHint();
  }

  onKeydown(e) {
    var code = e.keyCode;

    // Handle one-switch mode key press
    if (this.config.oneSwitchMode && this.config.oneSwitchKeyMap.indexOf(code) > -1) {
      // Prevent repeated keydown events while key is held
      if (!this.oneSwitchKeyPressed) {
        this.oneSwitchKeyPressed = true;
        this.switchPressStartTime = Date.now();

        // Start animating the progress indicator
        this.startProgressAnimation();
      }
      return;
    }

    // Handle regular two-switch mode
    if (this.config.dotKeyMap.indexOf(code) > -1) {
      this.dotButton.click();
    } else if (this.config.dashKeyMap.indexOf(code) > -1) {
      this.dashButton.click();
    } else if (code === 32) { // Space key for immediate commit
      this.commitCurrentSequence();
    }
  }

  startProgressAnimation() {
    // Cancel any existing animation
    if (this.progressAnimationFrame) {
      cancelAnimationFrame(this.progressAnimationFrame);
    }

    // Reset progress indicator
    if (this.progressIndicator) {
      this.progressIndicator.style.width = "0%";

      // Start the animation loop
      const startTime = this.switchPressStartTime;
      const threshold = this.config.oneSwitchTimeout;

      const animate = () => {
        if (!this.oneSwitchKeyPressed) return;

        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / threshold) * 100);

        // Update the progress bar width
        this.progressIndicator.style.width = progress + "%";

        // Change color when crossing the threshold
        if (progress >= 100) {
          this.progressIndicator.style.backgroundColor = "#ef4136"; // Red for dash
        } else {
          this.progressIndicator.style.backgroundColor = "#00a651"; // Green for dot
        }

        // Continue animation
        this.progressAnimationFrame = requestAnimationFrame(animate);
      };

      // Start animation
      this.progressAnimationFrame = requestAnimationFrame(animate);
    }
  }

  onKeyup(e) {
    var code = e.keyCode;

    // Only process keyup for one-switch mode
    if (this.config.oneSwitchMode && this.config.oneSwitchKeyMap.indexOf(code) > -1) {
      if (this.oneSwitchKeyPressed) {
        var pressDuration = Date.now() - this.switchPressStartTime;

        // Stop the progress animation
        if (this.progressAnimationFrame) {
          cancelAnimationFrame(this.progressAnimationFrame);
          this.progressAnimationFrame = null;
        }

        // Reset progress indicator with a small delay to show the final state
        setTimeout(() => {
          if (this.progressIndicator) {
            this.progressIndicator.style.width = "0%";
          }
        }, 300);

        // Determine if it's a dot or dash based on press duration
        if (pressDuration < this.config.oneSwitchTimeout) {
          // Short press = dot
          this.dotButton.click();
        } else {
          // Long press = dash
          this.dashButton.click();
        }

        // Reset state
        this.oneSwitchKeyPressed = false;
      }
    }
  }

  commitCurrentSequence() {
    // Clear any existing timeout
    clearTimeout(this.timeout);

    // Only commit if there's a value in the output
    if (this.output.value && this.output.value !== null) {
      var eventDetail = {
        symbol: this.output.value,
        letter: this.morseDictionary[this.output.value],
      };

      if (this.config.autoCommit) {
        this.output.dispatchEvent(
          new CustomEvent("commit", {
            detail: eventDetail,
          })
        );
      }
    }
  }

  onClick(e) {
    if (!e || !e.target) {
      console.error("Invalid click event or target");
      return;
    }

    if (this.config.sounds && !this.detectIE()) {
      if (this.dotAudio && this.dashAudio) {
        this.dotAudio.currentTime = 0;
        this.dashAudio.currentTime = 0;
        this.dotAudio.pause();
        this.dashAudio.pause();
      }
    }

    if (this.config.notificationStyle === "output" && this.output) {
      if (this.outputStyleTimeout) {
        this.output.style.color = "#231F20";
        clearTimeout(this.outputStyleTimeout);
        clearTimeout(this.outputStyleHideTimeout);
        this.outputStyleHideTimeout = null;
        this.outputStyleTimeout = null;
        this.output.value = "";
      }
    }

    var button = e.target.id;
    if (button === "dot" && this.output) {
      this.output.value += ".";
      if (this.config.sounds && !this.detectIE() && this.game && this.game.have_audio && this.dotAudio) {
        this.dotAudio.play();
      }
    } else if (button === "dash" && this.output) {
      this.output.value += "-";
      if (this.config.sounds && !this.detectIE() && this.game && this.game.have_audio && this.dashAudio) {
        this.dashAudio.play();
      }
    }
    if (e && e.target) {
      e.target.style.boxShadow = "0px 2px 0px #A1A2A2";
      e.target.style.background = "#F7F7F7";
      e.target.style.color = "#000"; // Ensure text is visible in all modes
      e.target.style.border = "1px solid rgba(0, 0, 0, 0.1)"; // Add border for visibility
    }
    setTimeout(function () {
      if (e && e.target) {
        e.target.style.boxShadow = "0px 4px 0px #A1A2A2";
        e.target.style.background = "#FFFFFF";
        e.target.style.color = "#000"; // Ensure text is visible in all modes
        e.target.style.border = "1px solid rgba(0, 0, 0, 0.1)"; // Add border for visibility
      }
    }, 100);
    this.debounce();
  }

  debounce() {
    var _this = this;
    clearTimeout(this.timeout);
    this.timeout = setTimeout(function () {
      if (_this.output.value && _this.output.value !== null) {
        var eventDetail = {
          symbol: _this.output.value,
          letter: _this.morseDictionary[_this.output.value],
        };
        if (_this.config.autoCommit) {
          if (typeof window.CustomEvent !== "function") {
            var _CustomEvent = function _CustomEvent(event, params) {
              params = params || {
                bubbles: false,
                cancelable: false,
                detail: undefined,
              };
              var evt = document.createEvent("CustomEvent");
              evt.initCustomEvent(
                event,
                params.bubbles,
                params.cancelable,
                params.detail
              );
              return evt;
            };
            _CustomEvent.prototype = window.Event.prototype;
            window.CustomEvent = _CustomEvent;
          }
          _this.output.dispatchEvent(
            new CustomEvent("commit", {
              detail: eventDetail,
            })
          );
        }
      }
      clearTimeout(_this.timeout);
    }, this.config.debounce);
  }

  commit(e) {
    var letter = e.detail.letter;
    if (this.config.notification) {
      if (letter) {
        this.showNotification(letter);
      } else {
        this.showNotification(null, true);
      }
    }
    this.output.value = "";
    this.config.onCommit.call(this, e.detail);
  }

  mute() {
    if (this.config.sounds && !this.detectIE()) {
      this.dotAudio.muted = true;
      this.dashAudio.muted = true;
    }
  }

  unmute() {
    if (this.config.sounds && !this.detectIE()) {
      this.dotAudio.muted = false;
      this.dashAudio.muted = false;
    }
  }

  showNotification(letter, wrong) {
    var _this2 = this;
    if (this.config.notificationStyle === "output") {
      this.outputStyleTimeout = setTimeout(function () {
        _this2.output.style.color = wrong
          ? "rgba(255, 65, 54, 0.8)"
          : "#231F20";
        _this2.output.value = wrong ? "∅" : letter;
        _this2.outputStyleHideTimeout = setTimeout(function () {
          _this2.output.value = "";
        }, _this2.config.debounce - 300);
      }, 0);
    } else {
      this.el = document.getElementById("notification");
      this.el.innerHTML =
        '<span style="display: inline-block; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); vertical-align: middle;">' +
        (wrong ? "&empty;" : letter) +
        "</span>";
      this.el.style.background = wrong
        ? "rgba(255, 65, 54, 0.8)"
        : "rgba(0, 0, 0, 0.7)";
      clearTimeout(this.fadeTimeout);
      var fadeOut = function fadeOut() {
        var el = _this2.el;
        el.style.opacity = 1;
        if (_this2.fadeTimeout) {
          (function fade() {
            if ((el.style.opacity -= 0.1) < 0) {
              el.style.display = "none";
            } else {
              requestAnimationFrame(fade);
            }
          })();
        }
      };
      var fadeIn = function fadeIn() {
        var el = _this2.el;
        el.style.opacity = 0;
        el.style.display = "inline-block";
        (function fade() {
          var val = parseFloat(el.style.opacity);
          if (!((val += 0.1) > 1)) {
            el.style.opacity = val;
            requestAnimationFrame(fade);
          }
        })();
      };
      fadeIn();
      this.fadeTimeout = setTimeout(fadeOut, this.config.notificationDuration);
    }
  }

  destroy() {
    window.removeEventListener("keydown", this.boundOnKeydown);

    // Remove keyup event listener if one-switch mode was enabled
    if (this.config.oneSwitchMode) {
      window.removeEventListener("keyup", this.boundOnKeyup);
    }

    // Cancel any ongoing animation
    if (this.progressAnimationFrame) {
      cancelAnimationFrame(this.progressAnimationFrame);
      this.progressAnimationFrame = null;
    }

    this.dotButton.removeEventListener("click", this.boundOnClick);
    this.dashButton.removeEventListener("click", this.boundOnClick);
    this.output.removeEventListener("commit", this.boundCommit);

    if (this.config.notification && this.el) {
      document.body.removeChild(this.el);
      if (this.fadeTimeout) {
        clearTimeout(this.fadeTimeout);
      }
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    if (this.dotAudio && this.dashAudio) {
      document.body.removeChild(this.dotAudio);
      document.body.removeChild(this.dashAudio);
    }
    if (this.buttonBox) {
      this.buttonBox.removeChild(this.dotButton);
      this.buttonBox.removeChild(this.dashButton);
    }
    if (this.output && this.background) {
      this.background.removeChild(this.output);
    }
    document.body.removeChild(this.background);
  }

  detectIE() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");
    var trident = ua.indexOf("Trident/");
    var edge = ua.indexOf("Edge/");
    if (msie > 0 || trident > 0 || edge > 0) {
      return true;
    }
    return false;
  }

  updateKeyboardHint() {
    // Get the keyboard hint element
    const keyboardHint = document.querySelector(".keyboard-hint .key-row");
    if (!keyboardHint) return;

    if (this.config.oneSwitchMode) {
      // Update hint text for one-switch mode
      const oneSwitchKey = String.fromCharCode(this.config.oneSwitchKeyMap[0]);
      keyboardHint.innerHTML = `
        <span>${oneSwitchKey} key: Short press for dot, long press for dash</span>
        <span>Commit: Space</span>
      `;
    } else {
      // Default hint text for two-switch mode
      keyboardHint.innerHTML = `
        <span>Dot: J or .</span>
        <span>Dash: K or -</span>
        <span>Commit: Space</span>
      `;
    }
  }

  toggleOneSwitchMode(enable) {
    // Update the configuration
    this.config.oneSwitchMode = enable;

    // Add or remove keyup event listener based on mode
    if (enable) {
      window.addEventListener("keyup", this.boundOnKeyup, false);
    } else {
      window.removeEventListener("keyup", this.boundOnKeyup);

      // Reset progress indicator when disabling one-switch mode
      if (this.progressIndicator) {
        this.progressIndicator.style.width = "0%";
      }

      // Cancel any ongoing animation
      if (this.progressAnimationFrame) {
        cancelAnimationFrame(this.progressAnimationFrame);
        this.progressAnimationFrame = null;
      }
    }

    // Update the keyboard hint
    this.updateKeyboardHint();

    // Save preference to localStorage if available
    if (typeof Storage !== "undefined") {
      localStorage.setItem("one_switch_mode", enable);
    }

    return enable;
  }
}

module.exports.MorseBoard = MorseBoard;
