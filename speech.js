/*
 * Check for browser support
 */
var supportMsg = '';

if ('speechSynthesis' in window) {
  supportMsg = 'Your browser <strong>supports</strong> speech synthesis.';
} else {
  supportMsg = 'Sorry your browser <strong>does not support</strong> speech synthesis.<br>Try this in <a href="https://www.google.co.uk/intl/en/chrome/browser/canary.html">Chrome Canary</a>.';
}

// Fetch the list of voices and populate the voice options.
function loadVoices() {
  // Fetch the available voices.
  var voices = speechSynthesis.getVoices();

  return voices;
}

// Execute loadVoices.
loadVoices();

// Chrome loads voices asynchronously.
window.speechSynthesis.onvoiceschanged = function(e) {
  loadVoices();
};

// Create a new utterance for the specified text and add it to
// the queue.
function speak(text) {
  // Create a new instance of SpeechSynthesisUtterance.
  var msg = new SpeechSynthesisUtterance();

  // Set the text.
  msg.text = text;

  // Set the attributes.
  msg.volume = parseFloat(volumeInput.value);
  msg.rate = parseFloat(rateInput.value);
  msg.pitch = parseFloat(pitchInput.value);

  // If a voice has been selected, find the voice and set the
  // utterance instance's voice attribute.
  if (voiceSelect.value) {
    msg.voice = speechSynthesis.getVoices()
    .filter(function(voice) { return voice.name == voiceSelect.value; })[0];
  }

  // Queue this utterance.
  window.speechSynthesis.speak(msg);
}

