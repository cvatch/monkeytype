/**
 * Library of Babel Algorithm Implementation
 * Based on the TLOB (The Library of Babel) algorithm for Monkeytype integration
 * 
 * This implementation generates deterministic pseudo-random text from library addresses
 * and can be used to create a "Babel" typing mode in Monkeytype.
 */

export interface BabelPageResult {
  text: string;
  address: string;
  metadata: {
    hexagon: string;
    wall: number;
    shelf: number;
    volume: number;
    page: number;
    seed: number;
    wordCount: number;
  };
}

export class BabelGenerator {
  private readonly charset = "abcdefghijklmnopqrstuvwxyz .,";
  private readonly charsetSize = 29;
  private readonly maxSeed = 2147483647; // Max 32-bit signed integer

  /**
   * Generate a page from specific library coordinates
   */
  generatePage(
    hexagon: string = this.generateRandomHex(8),
    wall: number = Math.floor(Math.random() * 4),
    shelf: number = Math.floor(Math.random() * 32),
    volume: number = Math.floor(Math.random() * 32),
    page: number = Math.floor(Math.random() * 410),
    length: number = 200
  ): BabelPageResult {
    // Create unique address string
    const address = `${hexagon}:${wall}:${shelf}:${volume}:${page}`;
    
    // Generate deterministic seed from address
    const seed = this.hashToSeed(address);
    
    // Generate raw text using seeded algorithm
    const rawText = this.generateRawText(seed, length * 2); // Generate more to have options
    
    // Format text for typing practice
    const formattedText = this.formatForTyping(rawText, length);
    
    return {
      text: formattedText,
      address: address,
      metadata: {
        hexagon,
        wall,
        shelf,
        volume,
        page,
        seed: seed,
        wordCount: formattedText.split(' ').length
      }
    };
  }

  /**
   * Generate a random page with random coordinates
   */
  generateRandomPage(length: number = 200): BabelPageResult {
    return this.generatePage(
      this.generateRandomHex(8),
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 32),
      Math.floor(Math.random() * 32),
      Math.floor(Math.random() * 410),
      length
    );
  }

  /**
   * Find a page that contains specific text (simulation of search)
   */
  searchForText(searchText: string, length: number = 200): BabelPageResult {
    // Create seed from search text
    const searchSeed = this.hashToSeed(searchText.toLowerCase());
    
    // Generate address components from search seed
    const hexagon = this.generateRandomHex(8, searchSeed);
    const wall = searchSeed % 4;
    const shelf = (searchSeed >> 2) % 32;
    const volume = (searchSeed >> 7) % 32;
    const page = (searchSeed >> 12) % 410;
    
    // Generate page with search text embedded
    const result = this.generatePage(hexagon, wall, shelf, volume, page, length);
    
    // Try to embed search text naturally (simplified approach)
    if (searchText.length < 20 && searchText.length > 2) {
      const words = result.text.split(' ');
      const insertPosition = Math.floor(words.length / 3);
      words.splice(insertPosition, 0, searchText.toLowerCase());
      result.text = words.join(' ');
      result.metadata.wordCount = words.length;
    }
    
    return result;
  }

  /**
   * Validate library address format
   */
  isValidAddress(address: string): boolean {
    const parts = address.split(':');
    if (parts.length !== 5) return false;
    
    const [hexagon, wall, shelf, volume, page] = parts;
    
    // Validate hexagon (hex string)
    if (!/^[0-9A-Fa-f]+$/.test(hexagon)) return false;
    
    // Validate numeric ranges
    const wallNum = parseInt(wall);
    const shelfNum = parseInt(shelf);
    const volumeNum = parseInt(volume);
    const pageNum = parseInt(page);
    
    return (
      wallNum >= 0 && wallNum <= 3 &&
      shelfNum >= 0 && shelfNum <= 31 &&
      volumeNum >= 0 && volumeNum <= 31 &&
      pageNum >= 0 && pageNum <= 409
    );
  }

  /**
   * Parse address string into components
   */
  parseAddress(address: string): {
    hexagon: string;
    wall: number;
    shelf: number;
    volume: number;
    page: number;
  } | null {
    if (!this.isValidAddress(address)) return null;
    
    const [hexagon, wall, shelf, volume, page] = address.split(':');
    
    return {
      hexagon,
      wall: parseInt(wall),
      shelf: parseInt(shelf),
      volume: parseInt(volume),
      page: parseInt(page)
    };
  }

  /**
   * Generate random hexagon identifier
   */
  private generateRandomHex(length: number = 8, seed?: number): string {
    const hexChars = '0123456789ABCDEF';
    let result = '';
    
    if (seed !== undefined) {
      // Use seeded random for consistent generation
      let current = seed;
      const a = 1664525;
      const c = 1013904223;
      const m = Math.pow(2, 32);
      
      for (let i = 0; i < length; i++) {
        current = (a * current + c) % m;
        result += hexChars.charAt(current % hexChars.length);
      }
    } else {
      for (let i = 0; i < length; i++) {
        result += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
      }
    }
    
    return result;
  }

  /**
   * Hash string to numeric seed
   */
  private hashToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.maxSeed;
  }

  /**
   * Generate raw text using Linear Congruential Generator
   */
  private generateRawText(seed: number, length: number): string {
    // LCG parameters (same as used in many standard libraries)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    let current = seed;
    let text = '';
    
    for (let i = 0; i < length; i++) {
      current = (a * current + c) % m;
      const charIndex = current % this.charsetSize;
      text += this.charset.charAt(charIndex);
    }
    
    return text;
  }

  /**
   * Format raw babel text for typing practice
   */
  private formatForTyping(rawText: string, targetLength: number): string {
    // Split on spaces and filter empty strings
    let words = rawText.split(' ').filter(word => word.trim().length > 0);
    
    // Clean and process words
    words = words.map(word => {
      // Remove excessive punctuation
      word = word.replace(/[.,]{2,}/g, '');
      word = word.replace(/^[.,]+|[.,]+$/g, ''); // trim punctuation
      
      // Ensure reasonable word lengths
      if (word.length < 2) {
        // Pad very short words
        word += this.charset.charAt(Math.floor(Math.random() * 26));
      }
      if (word.length > 15) {
        // Truncate very long words
        word = word.substring(0, 15);
      }
      
      return word.toLowerCase();
    }).filter(word => word.length >= 2 && word.length <= 15);
    
    // Ensure we have enough words
    while (words.length < 30) {
      words.push(this.generateRandomWord());
    }
    
    // Calculate word count needed for target length
    const avgWordLength = 5.5; // Average English word length + space
    const targetWords = Math.max(20, Math.floor(targetLength / avgWordLength));
    
    // Return appropriately sized word list
    return words.slice(0, Math.min(targetWords, words.length)).join(' ');
  }

  /**
   * Generate a single random word
   */
  private generateRandomWord(): string {
    const length = Math.floor(Math.random() * 6) + 3; // 3-8 characters
    let word = '';
    for (let i = 0; i < length; i++) {
      const charIndex = Math.floor(Math.random() * 26); // Only letters a-z
      word += this.charset.charAt(charIndex);
    }
    return word;
  }
}

// Create singleton instance
const babelGenerator = new BabelGenerator();
export default babelGenerator;