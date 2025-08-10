// Handles input validation and processing
// Exports: validateTextInput, validateMessage, sanitizeInput

function validateTextInput(text) {
  const errors = [];
  
  if (!text || typeof text !== 'string') {
    errors.push('Text input is required');
    return { isValid: false, errors };
  }

  const trimmedText = text.trim();
  
  if (trimmedText.length === 0) {
    errors.push('Text input cannot be empty');
  }

  if (trimmedText.length > 5000) {
    errors.push('Text input is too long (maximum 5000 characters)');
  }

  if (trimmedText.length < 10) {
    errors.push('Text input is too short (minimum 10 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedText
  };
}

function validateMessage(message) {
  const errors = [];
  
  if (!message || typeof message !== 'string') {
    errors.push('Message is required');
    return { isValid: false, errors };
  }

  const trimmedMessage = message.trim();
  
  if (trimmedMessage.length === 0) {
    errors.push('Message cannot be empty');
  }

  if (trimmedMessage.length > 1000) {
    errors.push('Message is too long (maximum 1000 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: trimmedMessage
  };
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove special characters except basic punctuation
    .substring(0, 5000); // Limit length
}

module.exports = {
  validateTextInput,
  validateMessage,
  sanitizeInput
};
