/**
 * Index de procesadores de preprocesamiento
 */

export { TextPreprocessor } from './TextPreprocessor.js';
export { SpellingCorrector } from './processors/SpellingCorrector.js';
export { AbbreviationExpander } from './processors/AbbreviationExpander.js';
export { TextNormalizer } from './processors/TextNormalizer.js';
export { EmojiCleaner } from './processors/EmojiCleaner.js';

export default {
  TextPreprocessor,
  SpellingCorrector,
  AbbreviationExpander,
  TextNormalizer,
  EmojiCleaner,
};
