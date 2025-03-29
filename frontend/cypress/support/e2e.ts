// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide XHR requests from command log
const app = window.top;
if (app) {
  app.console.log = () => {};
}

// Hide XHR requests from command log
Cypress.on('log:added', (log) => {
  if (log.name === 'xhr') {
    log.hidden = true;
  }
}); 