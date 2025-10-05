/**
 * Custom Word Lists Management
 * Allows users to create, manage, and use their own word lists in Monkeytype
 */

import { LocalStorageWithSchema } from "./local-storage-with-schema";
import { z } from "zod";

const CustomWordListSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  words: z.array(z.string().min(1)).min(1, "At least one word is required"),
  dateCreated: z.number(),
  dateModified: z.number(),
  tags: z.array(z.string()).optional().default([]),
  description: z.string().optional().default(""),
  isPublic: z.boolean().optional().default(false),
});

const CustomWordListsSchema = z.array(CustomWordListSchema);

export type CustomWordList = z.infer<typeof CustomWordListSchema>;
export type CustomWordLists = z.infer<typeof CustomWordListsSchema>;

const customWordListsLS = new LocalStorageWithSchema({
  key: "monkeytype_custom_word_lists",
  schema: CustomWordListsSchema,
  fallback: [] as CustomWordLists,
});

export class CustomWordListsManager {
  private lists: CustomWordLists = [];
  private currentActiveList: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load custom word lists from local storage
   */
  private loadFromStorage(): void {
    try {
      this.lists = customWordListsLS.get();
    } catch (error) {
      console.error("Failed to load custom word lists:", error);
      this.lists = [];
    }
  }

  /**
   * Save custom word lists to local storage
   */
  private saveToStorage(): boolean {
    try {
      return customWordListsLS.set(this.lists);
    } catch (error) {
      console.error("Failed to save custom word lists:", error);
      return false;
    }
  }

  /**
   * Generate a unique ID for a new list
   */
  private generateId(): string {
    return `custom_list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new custom word list
   */
  createList(
    name: string,
    words: string[],
    description: string = "",
    tags: string[] = []
  ): CustomWordList | null {
    try {
      // Validate and clean words
      const cleanWords = words
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0 && word.length <= 50)
        .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates

      if (cleanWords.length === 0) {
        throw new Error("No valid words found");
      }

      const newList: CustomWordList = {
        id: this.generateId(),
        name: name.trim(),
        words: cleanWords,
        dateCreated: Date.now(),
        dateModified: Date.now(),
        description: description.trim(),
        tags: tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0),
        isPublic: false,
      };

      this.lists.push(newList);
      this.saveToStorage();
      return newList;
    } catch (error) {
      console.error("Failed to create custom word list:", error);
      return null;
    }
  }

  /**
   * Update an existing custom word list
   */
  updateList(
    id: string,
    updates: Partial<Pick<CustomWordList, "name" | "words" | "description" | "tags">>
  ): boolean {
    try {
      const listIndex = this.lists.findIndex(list => list.id === id);
      if (listIndex === -1) {
        throw new Error("List not found");
      }

      const list = this.lists[listIndex];
      
      if (updates.name !== undefined) {
        list.name = updates.name.trim();
      }
      
      if (updates.words !== undefined) {
        const cleanWords = updates.words
          .map(word => word.trim().toLowerCase())
          .filter(word => word.length > 0 && word.length <= 50)
          .filter((word, index, arr) => arr.indexOf(word) === index);
        
        if (cleanWords.length === 0) {
          throw new Error("No valid words found");
        }
        
        list.words = cleanWords;
      }
      
      if (updates.description !== undefined) {
        list.description = updates.description.trim();
      }
      
      if (updates.tags !== undefined) {
        list.tags = updates.tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0);
      }

      list.dateModified = Date.now();
      this.lists[listIndex] = list;
      
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error("Failed to update custom word list:", error);
      return false;
    }
  }

  /**
   * Delete a custom word list
   */
  deleteList(id: string): boolean {
    try {
      const listIndex = this.lists.findIndex(list => list.id === id);
      if (listIndex === -1) {
        return false;
      }

      this.lists.splice(listIndex, 1);
      
      // Clear active list if it was deleted
      if (this.currentActiveList === id) {
        this.currentActiveList = null;
      }
      
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error("Failed to delete custom word list:", error);
      return false;
    }
  }

  /**
   * Get all custom word lists
   */
  getAllLists(): CustomWordLists {
    return [...this.lists]; // Return a copy to prevent external modification
  }

  /**
   * Get a specific custom word list by ID
   */
  getListById(id: string): CustomWordList | null {
    return this.lists.find(list => list.id === id) || null;
  }

  /**
   * Get custom word lists by tag
   */
  getListsByTag(tag: string): CustomWordLists {
    return this.lists.filter(list => 
      list.tags?.includes(tag.toLowerCase())
    );
  }

  /**
   * Search custom word lists by name or description
   */
  searchLists(query: string): CustomWordLists {
    const lowerQuery = query.toLowerCase();
    return this.lists.filter(list => 
      list.name.toLowerCase().includes(lowerQuery) ||
      list.description?.toLowerCase().includes(lowerQuery) ||
      list.tags?.some(tag => tag.includes(lowerQuery))
    );
  }

  /**
   * Import word lists from text content
   */
  importFromText(
    name: string,
    textContent: string,
    delimiter: string = "\n"
  ): CustomWordList | null {
    try {
      const words = textContent
        .split(delimiter)
        .map(word => word.trim())
        .filter(word => word.length > 0);

      if (words.length === 0) {
        throw new Error("No words found in the imported text");
      }

      return this.createList(name, words, `Imported from text (${words.length} words)`);
    } catch (error) {
      console.error("Failed to import from text:", error);
      return null;
    }
  }

  /**
   * Export a word list to text format
   */
  exportToText(id: string, delimiter: string = "\n"): string | null {
    const list = this.getListById(id);
    if (!list) {
      return null;
    }

    return list.words.join(delimiter);
  }

  /**
   * Get words from a specific list for use in typing tests
   */
  getWordsForTyping(id: string): string[] {
    const list = this.getListById(id);
    if (!list) {
      return [];
    }

    return [...list.words]; // Return a copy
  }

  /**
   * Set the currently active custom word list
   */
  setActiveList(id: string | null): boolean {
    if (id !== null && !this.getListById(id)) {
      return false;
    }
    
    this.currentActiveList = id;
    return true;
  }

  /**
   * Get the currently active custom word list ID
   */
  getActiveListId(): string | null {
    return this.currentActiveList;
  }

  /**
   * Get the currently active custom word list
   */
  getActiveList(): CustomWordList | null {
    if (!this.currentActiveList) {
      return null;
    }
    
    return this.getListById(this.currentActiveList);
  }

  /**
   * Get all available tags from all lists
   */
  getAllTags(): string[] {
    const tagSet = new Set<string>();
    
    this.lists.forEach(list => {
      if (list.tags) {
        list.tags.forEach(tag => tagSet.add(tag));
      }
    });
    
    return Array.from(tagSet).sort();
  }

  /**
   * Get statistics about custom word lists
   */
  getStatistics(): {
    totalLists: number;
    totalWords: number;
    averageWordsPerList: number;
    mostUsedTags: string[];
  } {
    const totalLists = this.lists.length;
    const totalWords = this.lists.reduce((sum, list) => sum + list.words.length, 0);
    const averageWordsPerList = totalLists > 0 ? Math.round(totalWords / totalLists) : 0;
    
    // Count tag usage
    const tagCounts: Record<string, number> = {};
    this.lists.forEach(list => {
      if (list.tags) {
        list.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    const mostUsedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      totalLists,
      totalWords,
      averageWordsPerList,
      mostUsedTags,
    };
  }
}

// Create singleton instance
const customWordListsManager = new CustomWordListsManager();
export default customWordListsManager;