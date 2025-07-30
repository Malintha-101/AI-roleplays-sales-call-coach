require('dotenv').config(); // Loads .env variables

const { postInstruction } = require('./src/services/instructionService');

const instruction = `
Persona:
Name: John Doe
Age: 35
Location: New York
Psychological behavior: Analytical, skeptical
Financial state: Middle class
Occupation: IT Manager

Scenario:
Type: Cold call
Interrupt frequency: Low

At the end, provide feedback on: rapport building, product explanation, objection handling, closing.

Start the conversation as the buyer.
`;

postInstruction(instruction)
  .then(res => {
    console.log('AI Reply:', res.text);
  })
  .catch(err => {
    console.error('Error:', err);
  });
