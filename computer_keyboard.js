import * as Interactions from './interactions.js';

export function createKeyboardHandlers(computer) {
    return {
        handleKeyDown(event) {
            Interactions.handleKeyDown(computer, event);
        },
    };
}

