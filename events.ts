const { createEventAdapter } = require('@slack/events-api');
require('dotenv').config();

const slackEvents = createEventAdapter(process.env.SLACK_ACCESS_TOKEN);
const port = process.env.PORT || 3000;


slackEvents.on('message', (event) => {
  console.log(`Received a message event: user ${event.user} in channel ${event.channel} says ${event.text}`);
});

(async () => {
  // Start the built-in server
  const server = await slackEvents.start(port);

  // Log a message when the server is ready
  console.log(`Listening for events on ${server.address().port}`);
})();